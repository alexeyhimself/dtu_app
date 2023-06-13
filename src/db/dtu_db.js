const USE_CLICKHOUSE_DB = !['dotheyuse.com', '', 'localhost--'].includes(window.location.hostname);

const emty_db_schema = {'table_reports': []};
const current_db_version = 10;
const db_name_prefix = 'dtu_db';
const db_name = db_name_prefix + current_db_version;

// previously used, schema changed - so, need to create new and cleanup old
let ex_db_names_to_cleanup = ['dtu_db'];
for (let i = 0; i < current_db_version; i++) {
  ex_db_names_to_cleanup.push(db_name_prefix + i);
}

function DB_get_asked_from_user_filters_and_mute(user_filters, mute) {
  let mute_list = [];
  if (mute)
    mute_list = mute_list.concat(mute);

  let asked = {...user_filters};
  for (let i in mute_list)
    delete asked[mute_list[i]];

  return asked;
}

class DB {
  constructor() {
    this.db_m = JSON.parse(JSON.stringify(emty_db_schema)); // https://www.digitalocean.com/community/tutorials/copying-objects-in-javascript#deep-copying-objects
    this.init_local_storage();
    this.cleanup_ex_dbs();
  }

  init_local_storage() {
    if (!window.localStorage.getItem(db_name)) {
      window.localStorage.setItem(db_name, JSON.stringify(emty_db_schema));
    }
  }

  read_local_storage() {
    const db_ls = window.localStorage.getItem(db_name);
    return JSON.parse(db_ls);
  }

  get_storage_engine(topic) {
    if (!topic)
      return 'both';

    const in_memory_topics = ['auto-generated (lite)', 'auto-generated (heavy)'];
    if (in_memory_topics.includes(topic))
      return 'in-memory';

    return 'local';
  }

  get_records_by_engine_type(ctag, topic) {
    const storage_engine = this.get_storage_engine(topic);
    if (storage_engine == 'in-memory')
      return this.db_m.table_reports;
    else if (storage_engine == 'local')
      return this.read_local_storage().table_reports;
    else { // both
      const in_memory = this.db_m.table_reports;
      const in_local_storage = this.read_local_storage().table_reports;
      return in_memory.concat(in_local_storage);
    }
  }

  select(user_filters, mute) {
    if (!mute)
      mute = []
    let asked = DB_get_asked_from_user_filters_and_mute(user_filters, mute.concat(['datetime_to', 'datetime_from']))
    const records = this.get_records_by_engine_type(asked.ctag, asked.topic)
    let found_reports = [];
    for (let i in records) {
      const r = records[i];
      if (r['ctag'] != asked['ctag']) {
        continue;
      }
      if (!asked['topic']) { // select for topics doesn't contain topics
        found_reports.push(r);
        continue;
      }
      if (r['topic'] != asked['topic']) {
        continue;
      }

      const asked_keys = Object.keys(asked);

      if (asked_keys.length == 2) { // only ctag and topic
        found_reports.push(r);
        continue;
      }

      let matched = true;
      for (let i in asked_keys) {
        let key = asked_keys[i];
        let value = asked[key];
        if (key == 'element_path') {
          if (!String(r[key]).startsWith(String(value))) {
            matched = false;
            break;
          }
          continue;
        }
        if (key == 'uids') {
          const uids = asked[key];
          if (uids.length == 1 && uids[0] == '')
            continue;
          for (let i in uids) {
            if (!uids.includes(String(r['uid']))) {
              matched = false;
              break;
            }
          }
          continue;
        }
        if (key == 'uids_not') {
          const uids_not = asked[key];
          if (uids_not.length == 1 && uids_not[0] == '')
            continue;
          for (let i in uids_not) {
            if (uids_not.includes(String(r['uid']))) {
              matched = false;
              break;
            }
          }
          continue;
        }
        if (key == 'ugids') {
          const ugids = asked[key];
          //debugger
          if (ugids.length == 1 && ugids[0] == '')
            continue;
          matched = false;
          let r_ugids = r['ugids'] || [];
          for (let i in ugids) {
            if (!r_ugids.includes(ugids[i])) {
              matched = false;
              break;
            }
            else {
              matched = true;
            }
          }
          continue;
        }
        if (String(r[key]) != String(value)) {
          matched = false;
          break;
        }
        continue;  
      }

      if (matched)
        found_reports.push(r);
    }
    //console.log('asked', asked)
    //console.log('muted', mute_list)
    //console.log('found', found_reports)
    return found_reports;
  }

  insert(record) {
    const topic = record.topic;
    const storage_engine = this.get_storage_engine(topic);
    if (storage_engine == 'in-memory') {
      this.db_m.table_reports.push(record);
    }
    else if (storage_engine == 'local') {
      let db_s_json = this.read_local_storage();
      db_s_json.table_reports.push(record);
      window.localStorage.setItem(db_name, JSON.stringify(db_s_json));
    }
  }

  cleanup() {
    window.localStorage.setItem(db_name, JSON.stringify(emty_db_schema));
  }

  cleanup_ex_dbs() {
    for (let i in ex_db_names_to_cleanup)
      window.localStorage.removeItem(ex_db_names_to_cleanup[i]);
  }
}

let dtu_db = new DB();

function DB_SELECT_EMULATION_check_if_report_date_matches_dates_in_user_filters(r, user_filters) {
  let datetime_from = user_filters['datetime_from'];
  let datetime_to = user_filters['datetime_to'];

  if (datetime_from == datetime_to) {
    return true;
  }
  if (!datetime_from && !datetime_to) {
    return true;
  }
  if (!datetime_from && datetime_to) {
    if (r.date_time > datetime_to) {
      return false;
    }
  }
  if (datetime_from && !datetime_to) {
    if (r.date_time < datetime_from) {
      return false;
    }
  }
  if (datetime_from && datetime_to) {
    if (r.date_time > datetime_to || r.date_time < datetime_from) {
      return false;
    }
  }

  return true;
}

function DB_SELECT_EMULATION_select_reports_WHERE_dates_IN_AND_OUT_user_filters(somewhere, user_filters) {
  let found_reports_in = [];
  let found_reports_out = [];
  for (let i in somewhere) {
    let report = somewhere[i];
    if (DB_SELECT_EMULATION_check_if_report_date_matches_dates_in_user_filters(report, user_filters))
      found_reports_in.push(report);
    else
      found_reports_out.push(report);
  }
  return {'in': found_reports_in, 'out': found_reports_out, 'all': [].concat(found_reports_in).concat(found_reports_out)};
}

function DB_SELECT_all_WHERE_user_filters(user_filters, mute_list) {
  // SELECT * FROM reports_table WHERE 1=1
  // AND ctag = user_filters.ctag
  // AND topic = user_filters.topic
  // AND date_time BETWEEN (user_filters.date_time_from, user_filters.date_time_to)

  // SELECT * FROM reports_table WHERE 1=1
  // AND ctag = user_filters.ctag
  // AND topic = user_filters.topic
  // AND date_time NOT BETWEEN (user_filters.date_time_from, user_filters.date_time_to)

  let table_reports = [];
  if (USE_CLICKHOUSE_DB)
    table_reports = CLICKHOUSE_DB_SELECT_something_WHERE_user_filers_AND_NOT_mute(user_filters, mute_list);
  else
    table_reports = dtu_db.select(user_filters, mute_list);

  return DB_SELECT_EMULATION_select_reports_WHERE_dates_IN_AND_OUT_user_filters(table_reports, user_filters);
}

function DB_SELECT_DISTINCT_something_distinct_FROM_somewhere(something_distinct, somewhere) {
  let found_items = {};
  if (!somewhere)
    return found_items;

  for (let i in somewhere) {
    let r = somewhere[i];
    let item = r[something_distinct];
    if (typeof(item) == 'object')
      item = JSON.stringify(item); // to allow filtering for arrays as strings as well https://www.freecodecamp.org/news/how-to-compare-arrays-in-javascript/

    item_count_in_found_items = found_items[item]
    if (item_count_in_found_items) {
      if (something_distinct == 'uid') {
        let ugids = String(r['ugids']);

        if (found_items[item]['ugids']) {
          if (found_items[item]['ugids'][ugids]) {
            found_items[item]['ugids'][ugids] += 1;
          }
          else {
            found_items[item]['ugids'][ugids] = 1;
          }
        }
        else {
          found_items[item] = {'count': 1, 'type': r.element_type, 'ugids': {}};
          found_items[item]['ugids'][ugids] = 1;
        }
      }
      
      found_items[item].count += 1;
    }
    else {
      if (something_distinct == 'uid') {
        let ugids = String(r['ugids']);
        found_items[item] = {'count': 1, 'type': r.element_type, 'ugids': {}};
        found_items[item]['ugids'][ugids] = 1;
      }
      else {
        found_items[item] = {'count': 1, 'type': r.element_type};
      }
    }
  }
  //console.log(found_items)
  return found_items;
}
function DB_SELECT_DISTINCT_something_WHERE_user_filers_AND_NOT_mute(user_filters, something_distinct, mute) {
  // SELECT DISTINCT something_distinct FROM reports_table WHERE 1=1
  // AND ctag = user_filters.ctag
  // AND topic = user_filters.topic
  // AND something.key1 = something.value1
  // AND ...
  // AND something.keyN = something.valueN

  if (USE_CLICKHOUSE_DB) {
    const filtered_something = CLICKHOUSE_DB_SELECT_DISTINCT_something_WHERE_user_filers_AND_NOT_mute(user_filters, something_distinct, mute);
    //console.log(3, filtered_something)
    const all = DB_SELECT_DISTINCT_something_distinct_FROM_somewhere(something_distinct, filtered_something);
    const in_filter = DB_SELECT_DISTINCT_something_distinct_FROM_somewhere(something_distinct, filtered_something);
    const out_of_filter = DB_SELECT_DISTINCT_something_distinct_FROM_somewhere(something_distinct, filtered_something);
    //console.log(something_distinct, filtered_something, all)
    return {'all': all, 'in': in_filter, 'out': out_of_filter};
  }
  else {
    const filtered_something = dtu_db.select(user_filters, mute);
    const in_out = DB_SELECT_EMULATION_select_reports_WHERE_dates_IN_AND_OUT_user_filters(filtered_something, user_filters);

    const all = DB_SELECT_DISTINCT_something_distinct_FROM_somewhere(something_distinct, filtered_something);
    const in_filter = DB_SELECT_DISTINCT_something_distinct_FROM_somewhere(something_distinct, in_out.in);
    const out_of_filter = DB_SELECT_DISTINCT_something_distinct_FROM_somewhere(something_distinct, in_out.out);

    return {'all': all, 'in': in_filter, 'out': out_of_filter};
  }
}

function CLICKHOUSE_DB_SELECT_something_WHERE_user_filers_AND_NOT_mute(user_filters, mute) {
  //console.log(user_filters)
  let asked = DB_get_asked_from_user_filters_and_mute(user_filters, mute);
  for (let key in asked) {
    if (key == 'element_path') {
      asked['element_path_string'] = (asked[key]).join(',');
      delete asked['element_path'];
    }
    else if (typeof(asked[key]) == 'object')
      asked[key] = JSON.stringify(asked[key]);
  }
  var url = new URL('/api/read');
  url.search = new URLSearchParams(asked).toString();
  //console.log(url)
  var request = new XMLHttpRequest(); // https://stackoverflow.com/questions/14220321/how-do-i-return-the-response-from-an-asynchronous-call
  request.open('GET', url, false);  // `false` makes the request synchronous
  request.send();

  return JSON.parse(request.responseText);
}

function CLICKHOUSE_DB_SELECT_DISTINCT_something_WHERE_user_filers_AND_NOT_mute(user_filters, something_distinct, mute) {
  //console.log(user_filters)
  let asked = DB_get_asked_from_user_filters_and_mute(user_filters, mute);
  for (let key in asked) {
    if (key == 'element_path') {
      asked['element_path_string'] = (asked[key]).join(',');
      delete asked['element_path'];
    }
    else if (typeof(asked[key]) == 'object')
      asked[key] = JSON.stringify(asked[key]);
  }
  var url = new URL('/api/read_distinct/' + something_distinct);
  url.search = new URLSearchParams(asked).toString();
  //console.log(url)
  var request = new XMLHttpRequest(); // https://stackoverflow.com/questions/14220321/how-do-i-return-the-response-from-an-asynchronous-call
  request.open('GET', url, false);  // `false` makes the request synchronous
  request.send();

  return JSON.parse(request.responseText);
}