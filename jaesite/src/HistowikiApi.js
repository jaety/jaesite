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
