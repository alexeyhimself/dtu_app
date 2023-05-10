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

// https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
async function DTU_RX_API_submint_report(report) {
  // Default options are marked with *
  delete report.ugid // temporary disabled
  const response = await fetch('/api/submit', {
    method: "POST",
    mode: "cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
    },
    redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(report), // body data type must match "Content-Type" header
  });
  return response.json(); // parses JSON response into native JavaScript objects
}

/*
postData("https://example.com/answer", { answer: 42 }).then((data) => {
  console.log(data); // JSON data parsed by `data.json()` call
});
*/