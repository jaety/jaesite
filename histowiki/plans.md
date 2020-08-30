# Wikidata interaction

Wikidata is a graph database of structured data extracted from Wikipedia and elsewhere. This project 
will be a browser based on that data for perusing human history.

There is a [SPARQL website](https://query.wikidata.org/) for querying metadata.

What I want to capture about a person, initially, is

* QID
* Name
* Date of Birth
* Date of Death
* Place of Birth
* Place of Death

Here's a query for that data for everyone born in 1901. Note that there may be more than one entry for these records.

```
select ?person ?name ?birthDate ?birthPrecision ?birthPlace ?birthPlaceName ?birthCoords ?deathDate ?deathPrecision ?deathPlace ?deathPlaceName
where {
 ?person wdt:P31 wd:Q5;
         wdt:P569 ?birthDate.
  hint:Prior hint:rangeSafe "true"^^xsd:boolean.
  FILTER((?birthDate >= "1901-01-01"^^xsd:dateTime) && (?birthDate < "1902-01-01"^^xsd:dateTime))  
 OPTIONAL {
   ?person p:P569/psv:P569 $birthTime.
   ?birthTime wikibase:timePrecision $birthPrecision              
 }
 OPTIONAL {
    ?person rdfs:label ?name
    FILTER (LANG(?name) = "en").   
 }
 OPTIONAL {
    ?person schema:description ?desc
    FILTER (LANG(?desc) = "en").
 }
 OPTIONAL {
    ?person wdt:P19  ?birthPlace.
    ?birthPlace wdt:P625 ?birthCoords.
    ?birthPlace rdfs:label ?birthPlaceName
    FILTER (LANG(?birthPlaceName) = "en").
 }
 OPTIONAL {
    ?person wdt:P570 ?deathDate;
            wdt:P20  ?deathPlace.
    ?deathPlace wdt:P625 ?deathCoords.
    ?deathPlace rdfs:label ?deathPlaceName
    FILTER (LANG(?deathPlaceName) = "en").
    ?person p:P570/psv:P570 $deathTime.
    ?deathTime wikibase:timePrecision $deathPrecision
 }

}
```

I want to register a collection of QIDs and cache
their geotemporal coordinates. Then set up to refresh periodically based on changes to the underlying database.

# Creating the Database 

https://towardsdatascience.com/amazon-rds-step-by-step-guide-14f9f3087d28

# Monitoring Changes

This is a piece I haven't explored very much.

* https://www.wikidata.org/w/api.php?action=help&modules=wbgetentities 
    * JSON for a particular ID
  https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q42&languages=en
* recent changes https://www.wikidata.org/w/api.php?action=feedrecentchanges&feedformat=rss

# Put it all together

1. Create an appropriate database
   AWS Micro reserved will cost me about $12 a month. 
   But start with On-Demand while in development.
   And a script to spin everything up, and spin it down.
2. Seed the list of QIDs
3. Authoring tools for extracting data for those QIDs
4. A monitor, running on Lambda 