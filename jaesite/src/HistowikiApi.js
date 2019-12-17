function withUrlParams(url, params) {
  var urlObj = new URL(url);
  var paramsFixed = params || {};
  Object.keys(paramsFixed).forEach(key => {
    if (typeof paramsFixed[key] !== 'undefined') { urlObj.searchParams.append(key, paramsFixed[key]); }
  })
  return urlObj;
}


export class HistowikiApi {
  constructor(baseUrl = "http://localhost:5000") {
    this.baseUrl = baseUrl
  }

  apiUrl(endPoint, params) {
    return withUrlParams(new URL(endPoint,this.baseUrl), params);
  }

  /**
   *  Returns { columns: [], rows : [] }
   *    columns: list of strings. names of the columns
   *    rows   : list of lists. Inner items in order defined by columns
   *
   *    person
   *    name
   *    birth_point { type: "Point", coordinates: [lat, lng] }
   *    desc
   *    birthTime // UTC Format e.g. 0962-01-01T00:00:00Z.
   *    birthPlaceName
   */
  people({
      bounds, // geometry.Rect
      limit,
      only_query} = {}
    ) {
      const params = Object.assign({}, bounds.asDict(), {limit:limit, only_query:only_query});
      return fetch(this.apiUrl("people", params))
        .then(response => response.json())
      }

  wikipedia_summary({qid}) {
    if (!qid) { throw new Error("qid is required"); }
    return fetch(this.apiUrl(`wikipedia_summary/${qid}`))
      .then(response => response.json());
  }
}
