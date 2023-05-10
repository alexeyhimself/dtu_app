function DB_INSERT_report(r) {
  DB_INSERT_enrich_report(r);
  dtu_db.insert(r);
}

function DB_INSERT_enrich_report(r) {
  if (!r.topic)
    r.topic = "default";

  if (!r.element_path) // enrich
    r.element_path = ['', r.element];
  if (r.element_path[0] !== '')
    r.element_path.unshift(''); // add to the beginning as "all" elements for filter

  r.element_path_string = JSON.stringify(r.element_path);
}

function RX_API_save_to_db(r) {
  // let report = JSON.parse(r); // parse payload after receive
  let report = r; // till no real networking - no parse to save CPU time
  DB_INSERT_report(report);
}

function DTU_RX_API_submint_report_endpoint(report) {
  RX_API_save_to_db(report);
}

console.warn("make element path to lower case both for rx and tx apis")