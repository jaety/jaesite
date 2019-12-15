from flask import Flask
from flask import Response
from flask import request
from flask_cors import CORS
import json
import math
import psycopg2
import sys
from functools import reduce
import requests

app = Flask(__name__)
CORS(app)

def hello_world():
    data = {
        "hello": 2,
        "world": 1
    }
    with open("onecountry.json") as fin:
        js = fin.read()
    resp = Response(js, status=200, mimetype="application/json")
    return resp

def query_db(query, parse_results = lambda x,y: x, only_query=False):
    if only_query:
        resp = Response(query, status=200, mimetype="text/plain")
    else:
        try:
            connection = psycopg2.connect(user = "geo",
                                          password = "geo123",
                                          host = "127.0.0.1",
                                          port = "5432",
                                          database = "geobrowser")
            cursor = connection.cursor()
            cursor.execute(query)
            records = cursor.fetchall()
            columns = [c[0] for c in cursor.description]
        # except (Exception, psycopg2.Error) as error :
        #    print ("Error while connecting to PostgreSQL", error)
        finally:
            #closing database connection.
            if(connection):
                cursor.close()
                connection.close()
                print("PostgreSQL connection is closed")

        js = json.dumps(parse_results(records, columns))
        resp = Response(js, status=200, mimetype="application/json")
    return resp

@app.route('/count_in_box')
def count_in_box():
    # http://localhost:5000/count_in_box?minx=14.832916259765627&maxx=51.96670532226563&miny=-5.998191731307857&maxy=19.942691925017307
    box = { p:request.args.get(p) for p in ['minx','maxx','miny','maxy']}
    return query_db("""
        select count(*) from people
            WHERE name is not null
            AND "birthCoords" &&
    	        ST_MakeEnvelope (
                    {minx}, {miny}, -- bounding
                    {maxx}, {maxy}, -- box limits
                    4326)
    """.format(**box), lambda x,y: int(x[0][0]))

@app.route('/people_in_box')
def people_in_box():
    def format_result(records, columns):
        return {
            "columns" : columns,
            "rows" : records
        }

    box = { p:request.args.get(p) for p in ['minx','maxx','miny','maxy']}
    return query_db("""
        select person, name, ST_AsGeoJSON("birthCoords")::json as birth_point, "desc", "birthTime", "birthPlaceName" from people
            WHERE name is not null
            AND "birthCoords" &&
	        ST_MakeEnvelope (
                {minx}, {miny}, -- bounding
                {maxx}, {maxy}, -- box limits
                4326)
    """.format(**box), format_result)

def qid_url(qid, piece='url'):
    item = requests.get("https://www.wikidata.org/wiki/Special:EntityData/{}.json".format(qid))
    # return Response(item.content, status=200, mimetype="text/plain")
    json_item = json.loads(item.content)
    return json_item['entities'][qid]['sitelinks'].get('enwiki')[piece]

@app.route('/qid_wikipedia_url/<qid>')
def qid_wikipedia_url(qid):
    if qid:
        resp = qid_url(qid)
        return Response(json.dumps(resp), status=200, mimetype="application/json")

@app.route('/wikipedia_summary/<qid>')
def wikipedia_summary(qid):
    title = qid_url(qid, 'title')
    summary_url = ('https://en.wikipedia.org/w/api.php?action=query&prop=extracts&titles=' + title +
                  '&exlimit=1&exsentences=5&origin=*&format=json&explaintext=true')
    summary_payload = json.loads(requests.get(summary_url).content)
    summary = list(summary_payload['query']['pages'].values())[0]['extract']
    return Response(json.dumps(summary), status=200, mimetype="application/json")

@app.route('/people')
def people():
    only_query = request.args.get('only_query') != None
    limit = request.args.get('limit')
    limitStr = 'limit ' + limit if limit else ''
    boundsStr = ""
    bounds = { p:request.args.get(p) for p in ['minx','maxx','miny','maxy'] }
    print(bounds, file=sys.stderr)
    if reduce(lambda x,y: x and y, bounds.values()):
        boundsStr = """ AND "birthCoords" &&
        ST_MakeEnvelope (
            {minx}, {miny}, -- bounding
            {maxx}, {maxy}, -- box limits
            4326)
        """.format(**bounds)

    def format_result(records, columns):
        return {
            "columns" : columns,
            "rows" : records
        }
    return query_db("""
        select person, name, ST_AsGeoJSON("birthCoords")::json as birth_point, "desc", "birthTime", "birthPlaceName" from people
        where name is not null
    """ + boundsStr + limitStr, format_result, only_query)
    # return {"columns": columns, "rows":rows}

@app.route('/count_over_time')
def count_over_time():
    def format_result(records, columns):
        # assume (count, year, precision)
        min_year = records[0][1]
        max_year = records[-1][1]
        data = [[year,0] for year in range(min_year, max_year+1)]
        def year_index(year):
            return year - min_year
        for (count,year,precision) in records:
            if (precision >= 9): # Year
                data[year_index(year)][1] += count
            elif (precision == 8): # decade
                decade = math.floor(year / 10) * 10
                for year in range(decade,decade+10):
                    data[year_index(year)][1] += count
            elif (precision == 7): # century
                century = math.floor(year / 100) * 100
                for year in range(century, century+100):
                    data[year_index(year)][1] += count
            elif (precision == 6): # millenium
                millenium = math.floor(year / 1000) * 1000
                for year in range(millenium, millenium+1000):
                    data[year_index(year)][1] += count
        return data

    return query_db("""
        select count,year,precision from time_counts order by year,precision
    """, format_result)


@app.route('/')
def counts_by_country():
    def format_result(records, columns):
        return {
            "type":"FeatureCollection",
            "features": [r[0] for r in records]
        }

    return query_db("""
            	SELECT json_build_object(
            		'type',       'Feature',
            		'id',         gid,
            		'geometry',   ST_AsGeoJSON(ctry_geom)::json,
            		'properties', json_build_object(
            			'name', ctry_name,
            			'code', ctry_code,
            			'population', n_people
            		 )
            	 ) as geo
        	     FROM country_counts;
            """,format_result)
