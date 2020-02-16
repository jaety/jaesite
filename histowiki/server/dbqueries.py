import psycopg2

def query_db(query):
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

    return (records, columns)
