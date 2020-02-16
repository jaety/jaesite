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
import re
from psycopg2.extras import execute_values
from sqlalchemy import create_engine
import geopandas as gpd

QueryItem = namedtuple("QueryItem", ["fields","query"])

def retrieve_raw(query):
    url = 'https://query.wikidata.org/sparql'
    r = requests.post(url, data = {'format': 'json', 'query': query})
    json = r.json()
    return json

def index_by_ids(df, source_column='qid'):
    df['id'] = df[source_column].apply(lambda x: int(re.search('Q([0-9]+)$', x).group(1)))
    return df.set_index('id')

def retrieve(query, query_only=False, as_pandas=True, aggregator=lambda df: df, conversions={}):
    if query_only:
        return query
    else:
        json = retrieve_raw(query)
        if not as_pandas:
            return json
        else:
            return aggregator(index_by_ids(to_pandas(json, conversions)).drop('qid',axis=1))


def qids_by_daterange(begin, end, query_only=False, as_pandas=True):
    """ Distinct set of QIDs from a given time range, based on birth date """

    beginStr = """(?birth_date >= "{}-01-01"^^xsd:dateTime) && """.format(begin) if begin else ""
    endStr   = """(?birth_date <  "{}-01-01"^^xsd:dateTime)""".format(end)

    query = dedent("""
        select distinct ?qid
        where {{
          ?qid wdt:P31 wd:Q5;
                  wdt:P569 ?birth_date.
          hint:Prior hint:rangeSafe "true"^^xsd:boolean.
          FILTER({beginStr}{endStr})
        }}
    """).format(beginStr = beginStr, endStr = endStr)
    return retrieve(query, query_only, as_pandas)

def query_item(qids, item, query_only=False, as_pandas=True, list_options=False):
    queries = {
        "wikipedia": QueryItem(["?wikipedia"], """
                       ?wikipedia schema:about ?qid.
                       ?wikipedia schema:isPartOf <https://en.wikipedia.org/>.
                    """),
        "birth" : QueryItem(["?birth_time", "?birth_time_precision"], """
                       ?qid p:P569/psv:P569 ?birthNode.
                       ?birthNode wikibase:timeValue ?birth_time.
                       ?birthNode wikibase:timePrecision ?birth_time_precision.
                    """),
        "name" : QueryItem(["?name"], """
                        ?qid rdfs:label ?name.
                        FILTER (LANG(?name) = "en").
                    """),
        "desc" : QueryItem(["?desc"], """
                       ?qid schema:description ?desc
                       FILTER (LANG(?desc) = "en").
                    """),
        "birthplace" : QueryItem(["?birth_place", "?birth_coords","?birth_place_name"],
                    """
                        ?qid wdt:P19  ?birth_place.
                        ?birth_place wdt:P625 ?birth_coords.
                        ?birth_place rdfs:label ?birth_place_name
                        FILTER (LANG(?birth_place_name) = "en").
                    """),
        "deathplace" : QueryItem(["?death_place", "?death_coords", "?death_place_name"],
                    """
                        ?qid wdt:P20  ?death_place.
                        ?death_place wdt:P625 ?death_coords.
                        ?death_place rdfs:label ?death_place_name
                        FILTER (LANG(?death_place_name) = "en").
                    """),
        "death" : QueryItem(["?death_time", "?death_time_precision"], """
                        ?qid p:P570/psv:P570 ?deathNode.
                        ?deathNode wikibase:timeValue ?death_time.
                        ?deathNode wikibase:timePrecision ?death_time_precision.
                    """)
    }

    def coord_aggregator(df, name):
        temp_name = name + "_string"
        df[temp_name] = df[name].apply(lambda pt: (pt.x, pt.y))
        return df.sort_values(by=['id',temp_name]).drop(temp_name, axis=1).groupby(level=0).first()

    aggregator = {
        "birth" : lambda df: df.sort_values(by=['id','birth_time_precision','birth_time']).groupby(level=0).first(),
        "death" : lambda df: df.sort_values(by=['id','death_time_precision','death_time']).groupby(level=0).first(),
        "deathplace" : lambda df: coord_aggregator(df, 'death_coords'),
        "birthplace" : lambda df: coord_aggregator(df, 'birth_coords'),
        "wikipedia": lambda df: df.sort_values(by=['id', 'wikipedia']).groupby(level=0).first(),
        "name": lambda df: df.sort_values(by=['id','name']).groupby(level=0).first(),
        "desc": lambda df: df.sort_values(by=['id','desc']).groupby(level=0).first()
    }
    conversions = {
        "birth_coords" : shapely.wkt.loads,
        "death_coords" : shapely.wkt.loads,
        "birth_time_precision" : lambda x: int(x),
        "death_time_precision" : lambda x: int(x)
    }
    default_aggregator = lambda df: df

    if list_options:
        return list(queries.keys())
    else:
        idstr = "\n          ".join(["wd:Q{}".format(id) for id in qids])
        values_str = """
          VALUES ?qid {{
              {}
          }}
        """.format(idstr)

        query = dedent("""
        select ?qid {fields} {{
            {values}
            {filter}
        }}
        """.format(
            fields=" ".join(queries[item].fields),
            values=values_str,
            filter=queries[item].query)
        )

        return retrieve(query, query_only, as_pandas, aggregator=aggregator.get(item, default_aggregator), conversions=conversions)

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

def to_pandas(data, conversions={}):
    results = []
    vars = data['head']['vars']
    for item in data['results']['bindings']:
        row = {}
        for var in vars:
            val = deepquery(item, var + '/value')
            val = conversions.get(var, lambda x: x )(val) if val else val
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

class sqlalchemy_connection:
    def __enter__(self):
        self.engine = create_engine('postgresql://geo:geo123@localhost:5432/geobrowser')
        self.connection = self.engine.connect()
        return self.connection

    def __exit__(self, type, value, callback):
        self.connection.close()

class create_connection:
    def __enter__(self):
        self.connection = psycopg2.connect(database = 'geobrowser', user = 'geo', password = 'geo123')
        return self.connection
    def __exit__(self, type, value, callback):
        self.connection.close()


class create_cursor:
    def __init__(self, commit=True):
        self.commit = commit

    def __enter__(self):
        self.connection = psycopg2.connect(database = 'geobrowser', user = 'geo', password = 'geo123')
        self.cursor = self.connection.cursor()
        return self.cursor

    def __exit__(self, type, value, callback):
        if self.commit:
            self.connection.commit()
        self.cursor.close()
        self.connection.close()

def update_table(table_create_template, table_insert_template, table_values):
    with create_cursor() as cursor:
        cursor.execute(table_create_template)
        execute_values(cursor, table_insert_template, table_values)

def insert_qids(qids):
    sql_create = """
        CREATE TABLE IF NOT EXISTS person_qids (
            qid integer PRIMARY KEY
        )
    """
    sql_insert = """
        INSERT INTO person_qids (qid) VALUES %s
        ON CONFLICT (qid) DO NOTHING
    """
    update_table(sql_create, sql_insert, [(x,) for x in qids])


def create_people_table(table_name = "people"):
    with create_cursor() as cursor:
        cursor.execute(create_people_table_statement(table_name))
