const emty_db_schema = {'table_reports': []};
const db_name = 'dtu_db3';
const ex_db_names_to_cleanup = ['dtu_db', 'dtu_db2']; // previously used, schema changed - so, need to create new and cleanup old


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

  select(asked) {
    let records = this.get_records_by_engine_type(asked.ctag, asked.topic)
    //console.log(records.length)
    let found_reports = [];
    for (let i in records) {
      const r = records[i];
      if (r['ctag'] != asked['ctag']) {
        continue;
      }
      if (!asked['topic']) {
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
        //console.log(key, value, r)
        if (r[key] != value) {
          matched = false;
          break;
        }
      }

      if (matched)
        found_reports.push(r);
    }
    //console.log(asked)
    //console.log(found_reports)
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

function DB_SELECT_all_WHERE_user_filters(user_filters) {
  // SELECT * FROM reports_table WHERE 1=1
  // AND ctag = user_filters.ctag
  // AND topic = user_filters.topic
  // AND date_time BETWEEN (user_filters.date_time_from, user_filters.date_time_to)

  const ctag = user_filters['ctag'];
  const topic = user_filters['topic'];
  const table_reports = dtu_db.select({'ctag': ctag, 'topic': topic});

  let found_reports = [];
  for (let i in table_reports) {
    let report = table_reports[i];
    if (DB_SELECT_EMULATION_check_if_report_date_matches_dates_in_user_filters(report, user_filters)) {
      //console.log(new Date(report.date_time))
      found_reports.push(report);
    }
  }
  return found_reports;
}

function DB_SELECT_DISTINCT_something_distinct_FROM_somewhere(something_distinct, somewhere) {
  let found_items = [];
  if (somewhere) {
    for (let i in somewhere) {
      let r = somewhere[i];
      let item = r[something_distinct];
      if (typeof(item) == 'object')
        item = JSON.stringify(item); // to allow filtering for arrays as strings as well https://www.freecodecamp.org/news/how-to-compare-arrays-in-javascript/
      if (!found_items.includes(item))
        found_items.push(item);
    }
  }
  return found_items;
}

/*
function DB_SELECT_DISTINCT_elements_WHERE_ctag_topic(user_filters) {
  // SELECT DISTINCT element FROM reports_table WHERE 1=1
  // AND ctag = user_filters.ctag
  // AND topic = user_filters.topic

  const ctag = user_filters['ctag'];
  const topic = user_filters['topic'];
  const table_reports = dtu_db.select({'ctag': ctag, 'topic': topic});

  let found_elements = DB_SELECT_DISTINCT_something_distinct_FROM_somewhere('element', table_reports);
  return {'ctag': ctag, 'topic': topic, 'elements': found_elements};
}
*/

function DB_SELECT_DISTINCT_topics_WHERE_ctag_topic(user_filters) {
  // SELECT DISTINCT topic FROM reports_table WHERE 1=1
  // AND ctag = user_filters.ctag

  const ctag = user_filters['ctag'];
  const table_reports = dtu_db.select({'ctag': ctag});
  
  let found_topics = DB_SELECT_DISTINCT_something_distinct_FROM_somewhere('topic', table_reports);
  return {'ctag': ctag, 'topics': found_topics};
}

function DB_SELECT_DISTINCT_something_distinct_WHERE_ctag_topic_AND_something(user_filters, something_distinct, something) {
  // SELECT DISTINCT something_distinct FROM reports_table WHERE 1=1
  // AND ctag = user_filters.ctag
  // AND topic = user_filters.topic
  // AND something.key1 = something.value1
  // AND ...
  // AND something.keyN = something.valueN

  const filtered_something = DB_SELECT_all_WHERE_ctag_topic_AND_something(user_filters, something);
  //console.log(something)
  //console.log(filtered_something)
  return DB_SELECT_DISTINCT_something_distinct_FROM_somewhere(something_distinct, filtered_something);
}

function DB_SELECT_all_WHERE_ctag_topic_AND_something(user_filters, something) {
  // SELECT DISTINCT domain FROM reports_table WHERE 1=1
  // AND ctag = user_filters.ctag
  // AND topic = user_filters.topic
  // AND something.key1 = something.value1
  // AND ...
  // AND something.keyN = something.valueN

  if (!something)
    something = {};

  something['ctag'] = user_filters['ctag'];
  something['topic'] = user_filters['topic'];
  return dtu_db.select(something);
}
