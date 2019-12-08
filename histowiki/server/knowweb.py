from flask import Flask
from flask import Response
from flask import request
from flask_cors import CORS
import json
import psycopg2


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

def query_db(query, parse_results = lambda x,y: x):
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

@app.route('/people')
def people():
    def format_result(records, columns):
        return {
            "columns" : columns,
            "rows" : records
        }
    return query_db("""
        select person, name, ST_AsGeoJSON("birthCoords")::json as birth_point, "desc", "birthTime", "birthPlaceName" from people
        where name is not null
    """, format_result)
    # return {"columns": columns, "rows":rows}

@app.route('/count_over_time')
def count_over_time():
    def format_result(records, columns):
        return [[year, count] for (count,year) in records]
    return query_db("""
        select count,year from time_counts order by year
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
