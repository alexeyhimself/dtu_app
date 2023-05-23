/*
function TX_API_sum_values_of_dict(obj) { // https://stackoverflow.com/questions/16449295/how-to-sum-the-values-of-a-javascript-object
  return Object.values(obj).reduce((a, b) => a + b, 0);
}
*/

const STEP_SIZE = 7;

function TX_API_get_sum_of_list_values(list_sorted_by_value_desc) {
  let sum = 0;
  for (let i in list_sorted_by_value_desc)
    sum += list_sorted_by_value_desc[i];
  return sum;
}

function TX_API_get_avg(list_sorted_by_value_desc) {
  let items_number = list_sorted_by_value_desc.length;
  const sum = TX_API_get_sum_of_list_values(list_sorted_by_value_desc);
  return sum / items_number;
}

function TX_API_get_median(list_sorted_by_value_desc) {
  const items_number = list_sorted_by_value_desc.length;
  const middle_item_id = Math.floor(items_number / 2); // floor because arr ids count from 0, not 1
  const middle_item_value = list_sorted_by_value_desc[middle_item_id];
  if (items_number % 2 != 0) // if odd
    return middle_item_value;

  const another_middle_item_id = middle_item_id + 1; // next because was floor
  const another_middle_item_value = list_sorted_by_value_desc[another_middle_item_id];
  return (middle_item_value + another_middle_item_value) / 2;
}

function TX_API_get_mode(list_sorted_by_value_desc) {
  let arr = list_sorted_by_value_desc;
  return arr.sort((a,b) => // https://stackoverflow.com/questions/1053843/get-the-element-with-the-highest-occurrence-in-an-array
      arr.filter(v => v===a).length
    - arr.filter(v => v===b).length
  ).pop();
}

function TX_API_get_min(list_sorted_by_value_desc) {
  return list_sorted_by_value_desc[list_sorted_by_value_desc.length - 1];
}

function TX_API_get_max(list_sorted_by_value_desc) {
  return list_sorted_by_value_desc[0];
}

function TX_API_get_range(list_sorted_by_value_desc) {
  const max = TX_API_get_max(list_sorted_by_value_desc);
  const min = TX_API_get_min(list_sorted_by_value_desc);
  return max - min;
}

function TX_API_get_stats_for_list(list) {
  const list_sorted_by_value_desc = list.sort(function(a, b){return b - a});

  const min = TX_API_get_min(list_sorted_by_value_desc);
  const max = TX_API_get_max(list_sorted_by_value_desc);
  const avg = TX_API_get_avg(list_sorted_by_value_desc);
  const median = TX_API_get_median(list_sorted_by_value_desc);
  const mode = TX_API_get_mode(list_sorted_by_value_desc);
  const range = TX_API_get_range(list_sorted_by_value_desc);

  return {'avg': avg, 'median': median, 'mode': mode, 'range': range, 'min': min, 'max': max};
}

function TX_API_remove_anys(user_filters) { // if 'any' then this has no meaning for filtering - so get rid of them
  if (user_filters['url_domain_name'] == '-- any domain --')
    delete user_filters['url_domain_name'];
  if (user_filters['url_path'] == '-- any page --')
    delete user_filters['url_path'];
  if (user_filters['url_path'] == undefined) // why this? looks like no impact if disabled
    delete user_filters['url_path'];
  if (user_filters['element'] == '-- any element --')
    delete user_filters['element'];

  return user_filters;
}

function TX_API_add_ctag(user_filters) { // somehow via session ID associated with the acc
  user_filters['ctag'] = "DEMO MVP";
  return user_filters;
}

function TX_API_add_uids_to_kwargs(kwargs, user_filters) {
  const uids_dict_with_mute = DB_SELECT_DISTINCT_something_WHERE_user_filers_AND_NOT_mute(user_filters, 'uid', ['uids', 'ugids']);
  const uids_dict_no_mute = DB_SELECT_DISTINCT_something_WHERE_user_filers_AND_NOT_mute(user_filters, 'uid');
  const uids_dict_no_mute__in = uids_dict_no_mute.in;

  let new_uids_dict_no_mute__in = {};
  for (let uid in uids_dict_no_mute__in)
    new_uids_dict_no_mute__in[uid] = uids_dict_no_mute__in[uid].count;

  let uids_dict_no_mute__out = {...uids_dict_no_mute.all};
  for (let uid in uids_dict_no_mute__out) {
    if (uids_dict_no_mute__in[uid])
      delete uids_dict_no_mute__out[uid];
  }

  let new_uids_dict_no_mute__out = {};
  for (let uid in uids_dict_no_mute__out)
    new_uids_dict_no_mute__out[uid] = uids_dict_no_mute__out[uid].count;

  kwargs['uids__in'] = new_uids_dict_no_mute__in;
  kwargs['ugids__in'] = uids_dict_no_mute__in;
  kwargs['uids__in_length'] = Object.keys(uids_dict_no_mute.in).length;
  kwargs['uids__out'] = new_uids_dict_no_mute__out;
  kwargs['ugids__out'] = uids_dict_no_mute__out;
  kwargs['uids__all_length'] = Object.keys(uids_dict_with_mute.all).length;
  return kwargs;
}


function TX_API_add_topics_to_kwargs(kwargs, user_filters) {
  let mute_list = {...user_filters}
  delete mute_list['ctag']; // to mute everything but ctag

  const topics_match_ctag_dict = DB_SELECT_DISTINCT_something_WHERE_user_filers_AND_NOT_mute(user_filters, 'topic', Object.keys(mute_list));
  const all_topics_match_ctag_dict = topics_match_ctag_dict.all;

  //const all_topics_match_ctag_list = Object.keys(all_topics_match_ctag_dict).concat(['auto-generated (no data)']);
  const all_topics_match_ctag_list = Object.keys(all_topics_match_ctag_dict);
  kwargs['topics_match_ctag'] = all_topics_match_ctag_list;

  let topic = user_filters.topic;
  if (!topic || !all_topics_match_ctag_list.includes(topic))
    topic = all_topics_match_ctag_list[0]; // select first available then to show data for this topic
  kwargs['current_topic'] = topic;

  return kwargs;
}

function TX_API_add_domains_to_kwargs(kwargs, user_filters) {
  const url_domains_match_ctag_topic_dict = DB_SELECT_DISTINCT_something_WHERE_user_filers_AND_NOT_mute(user_filters, 'url_domain_name', ['element_path']);
  const all_url_domains_match_ctag_topic_dict = url_domains_match_ctag_topic_dict.all;

  all_url_domains_match_ctag_topic_list = Object.keys(all_url_domains_match_ctag_topic_dict);
  kwargs['url_domains_match_ctag_topic'] = all_url_domains_match_ctag_topic_list;

  let url_domain_name = user_filters.url_domain_name;
  if (url_domain_name == 'undefined') {
    console.warn('user_filters.url_domain_name is "undefined"') // when and why is this?
    url_domain_name = undefined;
  }

  if (all_url_domains_match_ctag_topic_list.length == 1)
    url_domain_name = all_url_domains_match_ctag_topic_list[0]; // if only one then assume as selected because selector is hiddden on UI in this case

  kwargs['current_domain'] = url_domain_name;
  return kwargs;
}

function TX_API_add_pages_to_kwargs(kwargs, user_filters) {
  const url_paths_match_url_domain_dict = DB_SELECT_DISTINCT_something_WHERE_user_filers_AND_NOT_mute(user_filters, 'url_path', ['url_path', 'element', 'element_path']);
  const all_url_paths_match_url_domain_dict = url_paths_match_url_domain_dict.all;

  all_url_paths_match_url_domain_list = Object.keys(all_url_paths_match_url_domain_dict)
  kwargs['url_paths_match_url_domain'] = all_url_paths_match_url_domain_list;
  kwargs['current_page'] = user_filters.url_path;
  return kwargs;
}

function TX_API_make_nested_dict_of_list(list) {
  let nested_dict = current = {}; // https://www.w3resource.com/python-exercises/dictionary/python-data-type-dictionary-exercise-27.php
  for (let i in list) {
    let name = list[i];
    current[name] = {};
    current = current[name];
  }
  return nested_dict;
}

function TX_API_make_list_of_nested_dicts(distinct_elements_paths_list) {
  let list_of_nested_dicts = [];
  for (let i = 0; i < distinct_elements_paths_list.length; i++) {
    let el_path = JSON.parse(distinct_elements_paths_list[i]);
    let new_dict = TX_API_make_nested_dict_of_list(el_path);
    list_of_nested_dicts.push(new_dict);
  }
  return list_of_nested_dicts;
}

function TX_API_deep_merge_list_of_nested_dicts_into_single_dict(list_of_nested_dicts) {
  // https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
  function isObject(item) { return (item && typeof item === 'object' && !Array.isArray(item)); }
  function mergeDeep(target, source) {
    let output = Object.assign({}, target);
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target))
            Object.assign(output, { [key]: source[key] });
          else
            output[key] = mergeDeep(target[key], source[key]);
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  let deep_merge_dict = {};
  for (let i = 0; i < list_of_nested_dicts.length; i++) {
    let dict = list_of_nested_dicts[i];
    deep_merge_dict = mergeDeep(deep_merge_dict, dict);
  }
  return deep_merge_dict;
}

function TX_API_count_starts_with(distinct_elements_paths_dict, searched_subpath) {
  let counter = 0;
  for (let path in distinct_elements_paths_dict) {
    if (path.startsWith(searched_subpath.slice(0, -1))) // slice(0,-1) due to cutting of trailing ']'
      counter += distinct_elements_paths_dict[path].count;
  }
  return counter;
}

function TX_API_build_offset_tree(deep_merge_dict, distinct_elements_paths_dict, level, path) {
  if (!level) level = 0;
  if (!path) path = [];
  let offset_tree = [];

  let keys = Object.keys(deep_merge_dict).sort();
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let value = deep_merge_dict[key];
    path.push(key);
    let offset = "";
    for (let j = 1; j < level; j++)
      offset += '&nbsp;&nbsp;&nbsp; ';

    let path_string = JSON.stringify(path);
    let calls = TX_API_count_starts_with(distinct_elements_paths_dict, path_string);
    let tree_branch = {
        'offset': offset,
        'element': key,
        'number_of_calls': calls,
        'element_path_string': path_string,
        'element_path': [...path]
      };

    if (distinct_elements_paths_dict[path_string])
      tree_branch['type'] = distinct_elements_paths_dict[path_string].type;
    else
      tree_branch['type'] = 'group';
    offset_tree.push(tree_branch);

    if (value) {
      level += 1;
      let more_offset_tree = TX_API_build_offset_tree(value, distinct_elements_paths_dict, level, path);
      if (more_offset_tree.length > 0) offset_tree = offset_tree.concat(more_offset_tree);
    }
    level -= 1;
    path.pop();
  }

  return offset_tree
}

function TX_API_transform_hierarchy_to_offset_list(distinct_elements_paths_dict) {
  const distinct_elements_paths_list = Object.keys(distinct_elements_paths_dict);
  const list_of_nested_dicts = TX_API_make_list_of_nested_dicts(distinct_elements_paths_list);
  const deep_merge_dict = TX_API_deep_merge_list_of_nested_dicts_into_single_dict(list_of_nested_dicts);
  let offset_tree = [];
    if (deep_merge_dict)
      offset_tree = TX_API_build_offset_tree(deep_merge_dict, distinct_elements_paths_dict);
  return offset_tree;
}

function TX_API_calc_elements_tree_with_weights(kwargs, user_filters) {
  kwargs['element_path'] = user_filters.element_path;

  const distinct_elements_paths_dict_no_mute = DB_SELECT_DISTINCT_something_WHERE_user_filers_AND_NOT_mute(user_filters, 'element_path');
  const distinct_elements_paths_dict_with_mute = DB_SELECT_DISTINCT_something_WHERE_user_filers_AND_NOT_mute(user_filters, 'element_path', ['element_path']); // for menu to show all elements no matter what filters
  kwargs['elements_hierarchy__in'] = TX_API_transform_hierarchy_to_offset_list(distinct_elements_paths_dict_no_mute.in);
  kwargs['elements_hierarchy__all'] = TX_API_transform_hierarchy_to_offset_list(distinct_elements_paths_dict_with_mute.all);

  const distinct_elements_paths_list__in = Object.keys(distinct_elements_paths_dict_no_mute.in);
  let distinct_elements_paths_dict__out = {...distinct_elements_paths_dict_with_mute.all};
  for (let element_path in distinct_elements_paths_dict__out) {
    if (distinct_elements_paths_list__in.includes(element_path) && distinct_elements_paths_dict__out[element_path].type !== 'group')
      delete distinct_elements_paths_dict__out[element_path]; 
  }
  kwargs['elements_hierarchy__out'] = TX_API_transform_hierarchy_to_offset_list(distinct_elements_paths_dict__out);
  
  return kwargs;
}

function TX_API_add_data_for_charts(kwargs, user_filters) {
  let mute_list = {...user_filters}
  delete mute_list['ctag']; // to mute everything but ctag
  delete mute_list['topic']; // to mute everything but topic
  const reports_for_user_filters_with_mute = DB_SELECT_all_WHERE_user_filters(user_filters, Object.keys(mute_list));

  const reports_for_user_filters = DB_SELECT_all_WHERE_user_filters(user_filters);

  const reports_match_user_filters__in = reports_for_user_filters.in;
  kwargs['reports_match_user_filters__in'] = reports_match_user_filters__in;
  kwargs['reports_match_user_filters__in_length'] = reports_match_user_filters__in.length;
  const reports_match_user_filters__out = reports_for_user_filters.out;
  //kwargs['reports_match_user_filters__out'] = reports_match_user_filters__out;
  kwargs['reports_match_user_filters__out_length'] = reports_match_user_filters__out.length;
  kwargs['reports_match_user_filters__all_length'] = reports_for_user_filters_with_mute.all.length;
  //console.log(reports_for_user_filters)
  return kwargs
}

function TX_API_process_user_filters_request(user_filters) {
  let kwargs = {};
  //console.log(user_filters)
  user_filters = TX_API_remove_anys(user_filters);
  user_filters = TX_API_add_ctag(user_filters);

  kwargs = TX_API_add_topics_to_kwargs(kwargs, user_filters);
  if (kwargs['current_topic']) user_filters.topic = kwargs['current_topic'];

  kwargs = TX_API_add_domains_to_kwargs(kwargs, user_filters);
  if (kwargs['current_domain']) user_filters.url_domain_name = kwargs['current_domain'];

  kwargs = TX_API_add_pages_to_kwargs(kwargs, user_filters);
  if (kwargs['current_page']) user_filters.url_path = kwargs['current_page'];

  kwargs = TX_API_add_uids_to_kwargs(kwargs, user_filters);

  kwargs = TX_API_calc_elements_tree_with_weights(kwargs, user_filters);  

  kwargs = TX_API_add_data_for_charts(kwargs, user_filters);

  return kwargs;
}

const TX_API_arrays_are_equal = (a, b) => // https://www.freecodecamp.org/news/how-to-compare-arrays-in-javascript/
  a.length === b.length && a.every((element, index) => element === b[index]);

function TX_API_get_dates_from_to(user_filters, kwargs) {
  const reports_match_user_filters__in_length = kwargs['reports_match_user_filters__in_length'];
  
  const datetime_to = user_filters['datetime_to'];
  let datetime_from = user_filters['datetime_from'];

  const reports_match_user_filters__in = kwargs['reports_match_user_filters__in'];
  if (datetime_to == datetime_from)
    datetime_from = reports_match_user_filters__in[0].date_time; // if not set then from first date in all related reports

  let time_range = datetime_to - datetime_from;
  return {'datetime_from': datetime_from, 'datetime_to': datetime_to, 'time_range': time_range};
}

function TX_API_get_ms_in_1_px(chart_width_px, displayed_time_range) {
  return Math.floor(displayed_time_range / chart_width_px); // how many milliseconds in 1 px
}

const CHART_SIZE = {'xs': 500, 's': 800, 'm': 1000, 'l': 1200}; // https://getbootstrap.com/docs/4.1/layout/grid/
const UNITS_NAMES = [ // https://www.chartjs.org/docs/latest/axes/cartesian/time.html#time-units
  'second',
  'minute',
  'hour',
  'day',
  //'week', // don't want weeks
  'month',
  //'quarter', // don't want quarters
  'year'
];
const UNITS_NAMES_VALUES = {
  'second': 10**3,
  'minute': 60 * 10**3,
  'hour': 60 * 60 * 10**3,
  'day': 24 * 60 * 60 * 10**3,
  // 'week': 7 * 24 * 60 * 60 * 10**3, // don't want weeks
  'month': 30 * 24 * 60 * 60 * 10**3,
  // 'quarter': 3 * 30 * 24 * 60 * 60 * 10**3, // don't want quarters
  'year': 365 * 24 * 60 * 60 * 10**3
};

function TX_API_get_display_unit_and_step(displayed_time_range, chart_width_px) {
  
  // CHART_SIZE.l and higher
  let min_pixels_for_tick = 100;
  let max_pixels_for_tick = 200;

  if (chart_width_px <= CHART_SIZE.xs) {
    min_pixels_for_tick = 50;
    max_pixels_for_tick = 150;
  }
  else if (chart_width_px <= CHART_SIZE.s) {
    min_pixels_for_tick = 80;
    max_pixels_for_tick = 160;
  }
  else if (chart_width_px <= CHART_SIZE.m) {
    min_pixels_for_tick = 90;
    max_pixels_for_tick = 180;
  }
  
  // has to be sorted - that's why list, but not dict
  const units_names = [...UNITS_NAMES].reverse(); // to go from largest to lowest to detect first > 0
  const units_values = [];
  for (let i in units_names) {
    let unit = units_names[i];
    units_values.push(UNITS_NAMES_VALUES[unit]);
  } // due to reverse of units_names this appears reverse automatically

  if (0 == displayed_time_range) { // artificial case of 0 seconds
    return {'unit': 'second', 'step_size': 1};
  }

  preferred_steps_for_units = {
    'year': [1, 2, 5, 10], 
    'month': [1, 2, 3, 6, 12], 
    'day': [1, 2, 3, 7, 10], 
    'hour': [1, 2, 3, 6, 12, 24], 
    'minute': [1, 2, 3, 5, 10, 12, 15, 20, 30, 60], 
    'second': [1, 2, 3, 5, 10, 12, 15, 20, 30, 60]
  };
  let min_steps = Math.floor(chart_width_px / max_pixels_for_tick);
  let max_steps = Math.floor(chart_width_px / min_pixels_for_tick);
  //console.log(min_steps, max_steps)

  let unit = 'second';
  let step_size = 1;

  for (let i in units_values) {
    let em = displayed_time_range / units_values[i]; // how many each of them in this time range
    let em_min = Math.floor(em / max_steps); // how many items in one step for min steps case
    let em_max = Math.floor(em / min_steps); // how many items in one step for max steps case

    //console.log(units_names[i], em, em_min, em_max);
  }
  for (let i in units_values) {
    let em = displayed_time_range / units_values[i]; // how many each of them in this time range
    let em_min = Math.floor(em / max_steps); // how many items in one step for min steps case
    let em_max = Math.floor(em / min_steps); // how many items in one step for max steps case

    if (em_min + 1 > 0 && em_max > 0) {
      unit = units_names[i];
      let preferred_steps_for_this_unit = preferred_steps_for_units[unit];
      for (let j in preferred_steps_for_this_unit) {
        let candidate = preferred_steps_for_this_unit[j];
        if (candidate >= em_min && candidate <= em_max) {
            if (em / candidate <= max_steps && em / candidate >= min_steps) {
              step_size = candidate;
              break;
            }
        }
        step_size = em_min;
      }
      break;
    }
  }

  //console.log(chart_width_px, unit, step_size);        
  return {'unit': unit, 'step_size': step_size};
}

function TX_API_prepare_time_windows_agregations(chart_width_px, user_filters, kwargs) {
  const dates = TX_API_get_dates_from_to(user_filters, kwargs)
  const ms_in_1_px = TX_API_get_ms_in_1_px(chart_width_px, dates.time_range);

  const margin_pixels_left = 0;
  const margin_pixels_right = STEP_SIZE; // curveStepAfter step (which is 7 now)
  const margin_pixels = margin_pixels_right + margin_pixels_left;
  const ms_in_1_px_with_margins = TX_API_get_ms_in_1_px(chart_width_px, dates.time_range + margin_pixels * ms_in_1_px);

  let agregation_result = [];
  if (ms_in_1_px_with_margins > 0) {
    if (dates.datetime_from != dates.datetime_to) {
      for (let t = dates.datetime_to + ms_in_1_px_with_margins * margin_pixels_right; // from "datetime_to -" to make most recent window always available
               t >= dates.datetime_from - ms_in_1_px_with_margins * margin_pixels_left; // till "datetime_from +" - to not to include oldest partial frame data
               t -= ms_in_1_px_with_margins) {
        agregation_result.push(t);
      }
    }
    else
      agregation_result.push(dates.datetime_from);
  }

  //console.log(new Date(dates.datetime_from))
  //console.log(new Date(dates.datetime_to))
  //console.log(dates.time_range, ms_in_1_px, ms_in_1_px_with_margins, ms_in_1_px_with_margins - ms_in_1_px)

  return {'agregation_result': agregation_result.reverse(), 
          'displayed_time_range': dates.time_range, 
          'datetime_from': dates.datetime_from, 
          'datetime_to': dates.datetime_to, 
          'ms_in_1_px': ms_in_1_px_with_margins};
}

function TX_API_get_reports_with_elements_path_match(user_filters, kwargs) {
  let reports_with_matched_element_paths = [];

  const element_path_user_filters = user_filters['element_path'];
  const element_path_user_filters_length = element_path_user_filters.length;
  const reports_match_user_filters__in = kwargs['reports_match_user_filters__in'];
  const reports_match_user_filters__in_length = kwargs['reports_match_user_filters__in_length'];

  for (let i = 0; i < reports_match_user_filters__in_length; i++) {
    let report = reports_match_user_filters__in[i];
    //console.log(new Date(report.date_time))
    let reports_match = true;
    if (!(element_path_user_filters_length == 1 && element_path_user_filters[0] == '')) { // if not [""]
      //console.log(element_path_user_filters, report)
      for (let j = 0; j < element_path_user_filters_length; j++) {
        if (report.element_path[j] != element_path_user_filters[j]) {
          reports_match = false;
          break;
        }
      }
    }

    if (reports_match)
      reports_with_matched_element_paths.push(report);
  }
  return reports_with_matched_element_paths;
}

function TX_API_get_optimal_time_step_for_agregations(chart_width_px, ms_in_1_px) {
  let step = 10;

  const AGREGATION_TRESHOLDS = {
    'xs': UNITS_NAMES_VALUES.second * 25,
    's':  UNITS_NAMES_VALUES.minute * 10,
    'm':  UNITS_NAMES_VALUES.minute * 25,
    'l':  UNITS_NAMES_VALUES.day * 1,
  };

  if (chart_width_px <= CHART_SIZE.xs) {
    //console.log("CHART_SIZE.xs")
    if (ms_in_1_px <= AGREGATION_TRESHOLDS.xs)
      step = 7;
    else if (ms_in_1_px <= AGREGATION_TRESHOLDS.s)
      step = 7;
    else if (ms_in_1_px <= AGREGATION_TRESHOLDS.m)
      step = 7;
    else if (ms_in_1_px <= AGREGATION_TRESHOLDS.l)
      step = 10;
  }
  else if (chart_width_px <= CHART_SIZE.s) {
    //console.log("CHART_SIZE.s")
    step = 1;
  }
  else if (chart_width_px <= CHART_SIZE.m) {
    //console.log("CHART_SIZE.m")
    if (ms_in_1_px <= AGREGATION_TRESHOLDS.xs)
      step = 1;
    else if (ms_in_1_px <= AGREGATION_TRESHOLDS.s)
      step = 4;
    else if (ms_in_1_px <= AGREGATION_TRESHOLDS.m)
      step = 5;
    else if (ms_in_1_px <= AGREGATION_TRESHOLDS.l)
      step = 7;
  }
  else if (chart_width_px <= CHART_SIZE.l) {
    //console.log("CHART_SIZE.l")
    step = 1;
  }
  else {
    //console.log("else")
    if (ms_in_1_px <= AGREGATION_TRESHOLDS.xs)
      step = 7;
    else if (ms_in_1_px <= AGREGATION_TRESHOLDS.s)
      step = 10;
    else if (ms_in_1_px <= AGREGATION_TRESHOLDS.m)
      step = 10;
    else if (ms_in_1_px <= AGREGATION_TRESHOLDS.l)
      step = 10;
  }
  
  /*
  for (key in UNITS_NAMES_VALUES) {
    console.log(key, ms_in_1_px / UNITS_NAMES_VALUES[key]);
  }
  console.log('chart_width_px:', chart_width_px, 'ms_in_1_px:', ms_in_1_px, 'step:', step, AGREGATION_TRESHOLDS);
  */
  step = STEP_SIZE; // disabled agregations
  return step;
}

function TX_API_get_data_for_chart_(chart_width_px, user_filters, kwargs) {
  const reports_with_elements_path_match = TX_API_get_reports_with_elements_path_match(user_filters, kwargs)
  let agregations = TX_API_prepare_time_windows_agregations(chart_width_px, user_filters, kwargs);
  let agregation_result = agregations.agregation_result;

  let stats = [];
  let position_in_reports = 0; // to continue from this, not from the beginning again
  for (let i in agregation_result) {
    stats.push(0); // create next step
    let date = agregation_result[i];
    for (let j = position_in_reports; j < reports_with_elements_path_match.length; j++) {
      let r = reports_with_elements_path_match[j];
      if (r.date_time <= date) { // this report is in this time frame, so collect it
        stats[i] += 1;
        position_in_reports += 1;
      }
      else {
        break; // this report from next frame, so go for next time frame
      }
    }
  }

  //console.warn(stats)

  let zeros = 0;
  let non_zeros = 0;
  for (let i in stats) {
    let item = stats[i];
    if (item == 0)
      zeros++
    else
      non_zeros++
  }
  //console.log('>> ', zeros, non_zeros, chart_width_px / non_zeros)
  //let step = 1;
  //if (chart_width_px / non_zeros < 32)
  let step = TX_API_get_optimal_time_step_for_agregations(chart_width_px, agregations.ms_in_1_px);

  let aggr_dates = [];
  let mins = [];
  let maxes = [];
  let medians = [];
  for (let i = 0; i < stats.length / step; i++) {
    let pack = stats.slice(i * step, i * step + step);
    const pack_stats = TX_API_get_stats_for_list(pack);

    mins.push(pack_stats.min);
    maxes.push(pack_stats.max);
    medians.push(pack_stats.median);
    aggr_dates.push(agregation_result[i * step]);
  }

  //console.table(TX_API_get_stats_for_list(stats))

  let labels = [];
  let data = {};
  for (let i in aggr_dates) {
    labels.push(parseInt(aggr_dates[i]));
  }
  data['mins'] = mins;
  data['medians'] = medians;
  data['maxes'] = maxes;

  let displayed_time_range = agregations.displayed_time_range;
  let display_unit_and_step = TX_API_get_display_unit_and_step(displayed_time_range, chart_width_px);

  //console.log('prettify me')
  // 8 hours
  let aggr;
  let aggr_unit;
  const aggregation_ms = Math.floor(agregations.ms_in_1_px * display_unit_and_step.step_size);
  const em = [...UNITS_NAMES].reverse();
  for (key in em) {
    let v = Math.round(aggregation_ms * 10 / UNITS_NAMES_VALUES[em[key]]) / 10; // https://stackoverflow.com/questions/7342957/how-do-you-round-to-1-decimal-place-in-javascript
    if (v >= 1) {
      aggr = v;
      aggr_unit = em[key];
      break;
    }
  }

  if (aggr > 1)
    aggr_unit += 's';

  //console.log('and me')
  // min, medium, max
  let min;
  let median;
  let max;
  if (mins) {
    min = [...mins].sort(function(a, b){return a - b})[0];
    median = TX_API_get_median([...medians].sort(function(a, b){return b - a}));
    max = [...maxes].sort(function(a, b){return b - a})[0];
  }

  return Object.assign({}, {'labels': labels, 'data': data, 'ms_in_pixel': agregations.ms_in_1_px, 'min': min, 'median': median, 'max': max, 'aggr': aggr, 'aggr_unit': aggr_unit}, display_unit_and_step);
}