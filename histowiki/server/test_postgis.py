import psycopg2
import json
try:
    connection = psycopg2.connect(user = "geo",
                                  password = "geo123",
                                  host = "127.0.0.1",
                                  port = "5432",
                                  database = "geobrowser")
    cursor = connection.cursor()
    # Print PostgreSQL Connection properties
    print ( connection.get_dsn_parameters(),"\n")
    # Print PostgreSQL version

    query = """
    	SELECT json_build_object(
    		'type',       'Feature',
    		'id',         gid,
    		'geometry',   ST_AsGeoJSON(geom)::json,
    		'properties', json_build_object(
    			'name', name,
    			'code', iso_a3,
    			'population', pop_est,
    			'continent', continent
    		 )
    	 ) as geo
	     FROM admin0
         WHERE continent = 'Africa'
         LIMIT 10;
    """
    cursor.execute(query)
    records = cursor.fetchall()
    print(json.dumps({
        "type":"FeatureCollection",
        "features":records[0]
    }))
except (Exception, psycopg2.Error) as error :
    print ("Error while connecting to PostgreSQL", error)
finally:
    #closing database connection.
        if(connection):
            cursor.close()
            connection.close()
            print("PostgreSQL connection is closed")
