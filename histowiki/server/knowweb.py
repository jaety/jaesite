from flask import Flask
from flask import Response
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


@app.route('/')
def africa_countries():
    try:
        connection = psycopg2.connect(user = "geo",
                                      password = "geo123",
                                      host = "127.0.0.1",
                                      port = "5432",
                                      database = "geobrowser")
        cursor = connection.cursor()

        query = """
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
        """
        #              WHERE continent = 'Africa';

        cursor.execute(query)
        records = cursor.fetchall()
    except (Exception, psycopg2.Error) as error :
        print ("Error while connecting to PostgreSQL", error)
    finally:
        #closing database connection.
        if(connection):
            cursor.close()
            connection.close()
            print("PostgreSQL connection is closed")

    js = json.dumps({
        "type":"FeatureCollection",
        "features":[r[0] for r in records]
    })
    resp = Response(js, status=200, mimetype="application/json")
    return resp
