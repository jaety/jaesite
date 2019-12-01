import requests
import os
import pandas as pd
import logging
import psycopg2
from string import Template
from collections import namedtuple
from textwrap import dedent, indent
from shapely.geometry import Point
import shapely.wkt

def people_count_query(begin,end):
    beginStr = """(?birthDate >= "{}-01-01"^^xsd:dateTime) && """.format(begin) if begin else ""
    return """
        SELECT (COUNT(?item) AS ?count)
        WHERE {{
	       ?item wdt:P31 wd:Q5 ;
                 wdt:P569 ?birthDate.
          hint:Prior hint:rangeSafe "true"^^xsd:boolean.
          FILTER({beginStr}(?birthDate < "{end}-01-01"^^xsd:dateTime))
        }}
    """.format(beginStr=beginStr, end=end)

def people_count(begin,end):
    return int(pull_from_wikidata(people_count_query(begin, end))['results']['bindings'][0]['count']['value'])

QueryItem = namedtuple("QueryItem", ["fields","query"])

conversions = {
    "birthCoords" : shapely.wkt.loads,
    "deathCoords" : shapely.wkt.loads
}

def people_query(begin,end,pieces):
    """
        pieces: birth, death, name, desc, birthPlace, deathPlace,
    """
    piece_defs = {
        "birth" : QueryItem(["?birthTime", "?birthPrecision"], """
                    OPTIONAL {
                       ?person p:P569/psv:P569 ?birthNode.
                       ?birthNode wikibase:timeValue ?birthTime.
                       ?birthNode wikibase:timePrecision ?birthPrecision.
                    }"""),
        "name" : QueryItem(["?name"], """
                    OPTIONAL {
                        ?person rdfs:label ?name.
                        FILTER (LANG(?name) = "en").
                    }"""),
        "desc" : QueryItem(["?desc"], """
                    OPTIONAL {
                       ?person schema:description ?desc
                       FILTER (LANG(?desc) = "en").
                    }"""),
        "birthplace" : QueryItem(["?birthPlace", "?birthCoords","?birthPlaceName"],
                    """
                    OPTIONAL {
                        ?person wdt:P19  ?birthPlace.
                        ?birthPlace wdt:P625 ?birthCoords.
                        ?birthPlace rdfs:label ?birthPlaceName
                        FILTER (LANG(?birthPlaceName) = "en").
                    }"""),
        "deathplace" : QueryItem(["?deathPlace", "?deathCoords", "?deathPlaceName"],
                    """
                    OPTIONAL {
                        ?person wdt:P570 ?deathDate;
                                wdt:P20  ?deathPlace.
                        ?deathPlace wdt:P625 ?deathCoords.
                        ?deathPlace rdfs:label ?deathPlaceName
                        FILTER (LANG(?deathPlaceName) = "en").
                    }"""),
        "death" : QueryItem(["?deathTime", "?deathPrecision"], """
                    OPTIONAL {
                        ?person p:P570/psv:P570 ?deathTime.
                        ?deathTime wikibase:timePrecision ?deathPrecision
                    }""")
    }

    beginStr = """(?birthDate >= "{}-01-01"^^xsd:dateTime) && """.format(begin) if begin else ""
    endStr   = """(?birthDate <  "{}-01-01"^^xsd:dateTime)""".format(end)
    vars     = " ".join([f for p in pieces for f in piece_defs[p].fields])
    optionals= dedent("\n".join([piece_defs[p].query for p in pieces]))

    return dedent("""
        select ?person {vars}
        where {{
          ?person wdt:P31 wd:Q5;
                 wdt:P569 ?birthDate.
          hint:Prior hint:rangeSafe "true"^^xsd:boolean.
          FILTER({beginStr}{endStr})
          {optionals}
        }}
    """).format(beginStr = beginStr, endStr = endStr, vars = vars, optionals = indent(optionals,"    "))

def pull_from_wikidata(query):
    url = 'https://query.wikidata.org/sparql'
    r = requests.get(url, params = {'format': 'json', 'query': query})
    if r.status_code == requests.codes.too_many_requests:
        logging.warning("timeout")
        return None
    else:
        data = r.json()
        return data

def deepquery(item, path, default = None):
    keys = path.split("/")
    val = None

    for key in keys:
        if val:
            if isinstance(val, list):
                val = [ v.get(key, default) if v else None for v in val]
            else:
                val = val.get(key, default)
        else:
            val = dict.get(item, key, default)
        if not val:
            break;

    return val

def to_pandas(data):
    results = []
    vars = data['head']['vars']
    for item in data['results']['bindings']:
        row = {}
        for var in vars:
            val = deepquery(item, var + '/value')
            val = conversions.get(var,lambda x: x)(val) if val else val
            row[var] = val
        results.append(row)
    return pd.DataFrame.from_records(results)

def create_people_table_statement(table_name = "people"):
    return """
        CREATE TABLE {} (
        	autoid SERIAL PRIMARY KEY,
        	qid VARCHAR(15),
            name TEXT,
            description TEXT,

        	birthDate TIMESTAMPTZ,
            birthPrecision INTEGER,
            birthQID VARCHAR(15),
            birthPlaceName TEXT,
        	birthCoords GEOGRAPHY(Point),

        	deathDate TIMESTAMPTZ,
            deathPrecision INTEGER,
            deathQID VARCHAR(15),
            deathPlaceName TEXT,
        	deathCoords GEOGRAPHY(Point)
        )
	""".format(table_name)

class create_cursor:
    def __enter__(self):
        self.connection = psycopg2.connect(database = 'geobrowser', user = 'geo', password = 'geo123')
        self.cursor = connection.cursor()
        return self.cursor
    def __exit__(self, type, value, callback):
        self.cursor.close()
        self.connection.close()

def create_people_table(table_name = "people"):
    with create_cursor() as cursor:
        cursor.execute(create_people_table_statement(table_name))
