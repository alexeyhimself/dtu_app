function DB_INSERT_enrich_report(r) {
  if (!r.topic)
    r.topic = "default";

  if (!r.element_path) // enrich
    r.element_path = ['', r.element];
  if (r.element_path[0] !== '')
    r.element_path.unshift(''); // add to the beginning as "all" elements for filter

  r.element_path_string = JSON.stringify(r.element_path);
}

function DTU_RX_API_submint_report_simulation(report, api_url) {
  DB_INSERT_enrich_report(report);
  dtu_db.insert(report);
}

console.warn("make element path to lower case both for rx and tx apis")
