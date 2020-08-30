from geobrowser.gbquery import DatabaseReader 

"""
JSON Contained within
dict: All keys in test contained within container
list: each item should match somewhere in container's list
literal: just match
"""

def test_counts_by_country():
    reader = DatabaseReader()
    counts = reader.counts_by_country()
    target = {
        'features' : [
            {
                'geometry' : {
                    'type' : 'MultiPolygon'
                },
                'id' : 138,
                'properties' : {
                    'code': 'ITA',
                    'name': 'Italy',
                    'population': 1246
                }
            }
        ],
        'type': 'FeatureCollection'
    }
    compare = next(x for x in counts['features'] if x['id'] == 138)
    assert compare['id'] == 138
    assert compare['properties']['code'] == 'ITA'
    assert compare['properties']['name'] == 'Italy'
    assert compare['properties']['population'] == 1246

def test_retrieve_person():
    reader = DatabaseReader()
    person = reader.person(192151)
    assert person['id']   == 192151
    assert person['name'] == 'Saint Valentine'
