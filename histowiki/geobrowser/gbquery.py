import psycopg2
import math

def query_db(query, parse_results = lambda x,y: x, only_query=False):
    if only_query:
        resp = query
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

        resp = parse_results(records, columns)
    return resp


"""
# DatabaseReader

box: {minx:float, miny:float, maxx:float, maxy:float}
"""
class DatabaseReader:
    def count_in_box(self, box):
        return query_db(
           """
                select count(*) from people
                    WHERE name is not null
                    AND "birthCoords" &&
                        ST_MakeEnvelope (
                            {minx}, {miny}, -- bounding
                            {maxx}, {maxy}, -- box limits
                            4326)
            """.format(**box), lambda x,y: int(x[0][0])) 
    
    def people_in_box(self, box):
        def format_result(records, columns):
            return {
                "columns" : columns,
                "rows" : records
            }

        return query_db(
            """
                select person, name, ST_AsGeoJSON("birthCoords")::json as birth_point, "desc", "birthTime", "birthPlaceName" from people
                    WHERE name is not null
                    AND "birthCoords" &&
                    ST_MakeEnvelope (
                        {minx}, {miny}, -- bounding
                        {maxx}, {maxy}, -- box limits
                        4326)
            """.format(**box), format_result)

    def counts_by_time_and_precision(self):
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
    
    def counts_by_country(self):
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

    def person(self, id):
        columns = [
            "id",
            "birthCoords",
            'birthPlace',
            'birthPlaceName',
            'birthPrecision',
            'birthTime',
            "deathCoords",
            'deathPlace',
            'deathPlaceName',
            'deathPrecision',
            'deathTime',
            'desc',
            'name',
            'person',
            'birthyear'
        ]
        columnStr = ", ".join(['"' + s + '"' for s in columns])
        row = query_db("""
            select {columns} from people
            where id = {id}
        """.format(id=id, columns=columnStr))
        return dict(zip(columns,row[0]))
