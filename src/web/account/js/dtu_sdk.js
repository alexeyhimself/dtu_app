const ctag = "DEMO MVP"; // to be given somehow via session ID mapping in DB, not in request

function ANALYTICS_PORTAL_SDK_init_time_shortcut_listeners() {
  const elements_to_track = document.querySelectorAll('.time-shortcut');
  for (let i = 0; i < elements_to_track.length; i++) {
    let el = elements_to_track[i];
    el.addEventListener("click", function(e) {
      ANALYTICS_PORTAL_SDK_remove_all_active_filter_class_from_time_shortcuts();
      this.classList.add('active-filter');
      const timedelta_ms = this.getAttribute('timedelta_ms');
      document.getElementById('timedelta_ms').setAttribute('timedelta_ms', timedelta_ms);
      //ANALYTICS_PORTAL_SDK_set_datetime_filter(timedelta_ms);
      ANALYTICS_PORTAL_SDK_refresh_elements_page_data_according_to_user_filters_setup_with_delay();
    }, false);
  }
}

function ANALYTICS_PORTAL_SDK_remove_all_active_filter_class_from_time_shortcuts() {
  const elements_to_track = document.querySelectorAll('.time-shortcut');
  for (let i in elements_to_track) {
    let el = elements_to_track[i];
    if (el.classList)
      el.classList.remove('active-filter')
  }
}

function ANALYTICS_PORTAL_SDK_split_everything_by_any_n_comma_semicolon_and_space(what) {
  let result = [];
  let n = what.trim().split('\n'); // trim again for same code as below
  for (let i = 0; i < n.length; i++) {
    let c = n[i].trim().split(',');
    for (let i = 0; i < c.length; i++) {
      let sc = c[i].trim().split(';');
      for (let i = 0; i < sc.length; i++) {
        let s = sc[i].trim().split(' ');
        result = result.concat(s);
      }
    }
  }
  return result;
}

function ANALYTICS_PORTAL_SDK_collect_user_filters_on_the_page() {
  let topic = window.localStorage.getItem('topic');
  const topic_element = document.getElementById('drpd:topic');
  if (!topic)
    topic = topic_element.value;
  else
    topic_element.value = topic;

  let user_filters = {"ctag": ctag, "topic": topic};

  const timedelta_element = document.getElementById('timedelta_ms');
  const timedelta_ms = timedelta_element.getAttribute('timedelta_ms');
  //user_filters['timedelta_ms'] = timedelta_ms;

  const datetime_to = Date.parse(new Date()) + 1000; // add 1s to let this event to reach db and to be included in this report
  const datetime_from = datetime_to - timedelta_ms;
  user_filters["datetime_from"] = datetime_from;
  user_filters["datetime_to"] = datetime_to;

  let in_page_path = [''];
  user_filters["element_path"] = in_page_path;

  if (topic_element.hasAttribute('changed'))
    return user_filters;

  const path = ['url_domain_name', 'url_path'];
  for (let i in path) {
    let drpd_path_suffix = path[i];
    let element = document.getElementById("drpd:" + drpd_path_suffix);
    if (element.value != '')
      user_filters[drpd_path_suffix] = element.value;
    if (element.hasAttribute("changed")) {
      return user_filters; // high level change, no need to collect other
    }
  }

  const element_path_element = document.getElementById("drpd:element");
  if (element_path_element) {
    //console.log(element_path_element.value)
    in_page_path = JSON.parse(element_path_element.value.replace(/'/g, '"'));
    user_filters["element_path"] = in_page_path;
  }

  const uids_element = document.getElementById("txt:uids");
  if (uids_element) {
    let uids_list = ANALYTICS_PORTAL_SDK_split_everything_by_any_n_comma_semicolon_and_space(uids_element.value);
    user_filters["uids"] = uids_list;
  }
  const uids_not_element = document.getElementById("txt:uids_not");
  if (uids_not_element) {
    let uids_not_list = ANALYTICS_PORTAL_SDK_split_everything_by_any_n_comma_semicolon_and_space(uids_not_element.value);
    user_filters["uids_not"] = uids_not_list;
  }

  //console.log(user_filters)
  return user_filters;
}

function ANALYTICS_PORTAL_SDK_init_uids_listeners() {
  //const ids = ['txt:uids', 'txt:uids_not'];
  const ids = ['txt:uids'];
  for (let i in ids) {
    const uids_element = document.getElementById(ids[i]);
    uids_element.addEventListener("change", function(e) {
      ANALYTICS_PORTAL_SDK_refresh_elements_page_data_according_to_user_filters_setup_with_delay();
    }, false);
  }
}

function ANALYTICS_PORTAL_SDK_start() {
  ANALYTICS_PORTAL_SDK_init_time_shortcut_listeners();
  ANALYTICS_PORTAL_SDK_refresh_elements_page_data_according_to_user_filters_setup();
  ANALYTICS_PORTAL_SDK_make_dropdowns_work();
  ANALYTICS_PORTAL_SDK_init_uids_listeners();
}

function ANALYTICS_PORTAL_SDK_make_dropdowns_work() {
  const elements_ids = ['drpd:topic', 'drpd:url_domain_name', 'drpd:url_path'];
  for (let i in elements_ids) {
    let element_id = elements_ids[i];
    let element = document.getElementById(element_id);
    element.addEventListener("change", function(e) {
      element.setAttribute("changed", "true");
      if (element_id == 'drpd:topic')
        window.localStorage.setItem('topic', element.value);

      ANALYTICS_PORTAL_SDK_refresh_elements_page_data_according_to_user_filters_setup_with_delay();
      element.removeAttribute("changed");
    });
  }
}

function ANALYTICS_PORTAL_SDK_make_element_dropdown_work() {
  let elements = document.getElementsByClassName("element_path");
  for (let i = 0; i < elements.length; i++) {
    let element = elements[i];
    element.addEventListener("change", function(e) {
      element.setAttribute("changed", "true");
      ANALYTICS_PORTAL_SDK_refresh_elements_page_data_according_to_user_filters_setup_with_delay();
      element.removeAttribute("changed");
    });
  }
}

function ANALYTICS_PORTAL_SDK_display_message_on_chart(chart, message) {
  let ctx = chart.ctx;
  chart.clear();
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = "14px Arial";
  ctx.fillText(message, chart.width / 2, chart.height / 2);
  ctx.restore();
}

function ANALYTICS_PORTAL_SDK_refresh_calls_over_time_for_chart_id_(chart_id, user_filters, kwargs) { 
  const element_id_to_hide = 'time__in';
  const element_to_hide = document.getElementById(element_id_to_hide);
  const element_id_to_show = 'time__in_no_data';
  const element_to_show = document.getElementById(element_id_to_show);
  const reports_match_user_filters__in_length = kwargs['reports_match_user_filters__in_length'];
  if (reports_match_user_filters__in_length == 0) {
    element_to_hide.style.display = 'none';
    element_to_show.style.display = 'grid';
    element_to_show.innerHTML = '<span class="no-data">' + ANALYTICS_PORTAL_SDK_generate_no_data_message() + '</span>';
    return;
  }
  else {
    element_to_hide.style.display = 'unset';
    element_to_show.style.display = 'none';
  }

  // https://gist.github.com/jeantimex/68e456aa4a536b245997b28330adace2
  // Step 1. Define the dimensions.
  const element_id_for_linear_chart = 'linear_chart';
  const element_with_linear_chart = document.getElementById(element_id_for_linear_chart);
  element_with_linear_chart.innerHTML = '';
  
  const width = element_with_linear_chart.offsetWidth;
  const height = element_with_linear_chart.offsetHeight || 300;
  const margin = {top: 10, right: 10, bottom: 30, left: 40};
  const chart_width_px = width - margin.left - margin.right; // ANALYTICS_PORTAL_SDK_get_chart_size(chart_id);
  config = TX_API_get_data_for_chart_(chart_width_px, user_filters, kwargs);          

  // Step 2. Prepare the data.
  data = [];
  for (let i in config.data.maxes) {
    let value = config.data.maxes[i];
    let date = config.labels[i];
    data.push({"date": date, "value": value})
  }

  // Step 3. Create x and y axes.
  const xScale = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([margin.left, width - margin.right]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, (d) => d.value * 1.05)]).nice() // 5% more than max value
    .range([height - margin.bottom, margin.top]);

  const xAxis = (g) => g
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(xScale)
            .ticks(width / 100) // tick per 100 pixels
      );

  const yAxis = (g) => g
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale)
            .ticks(height / 50) // tick per 50 pixels
      );

  // 4. Create the grid line functions.
  const xGrid = (g) => g;
  /*
    .attr('class', 'grid-lines')
    .selectAll('line')
    .data(xScale.ticks())
    .join('line')
    .attr('x1', d => xScale(d))
    .attr('x2', d => xScale(d))
    .attr('y1', margin.top)
    .attr('y2', height - margin.bottom);
  */
  const yGrid = (g) => g
    //.attr('class', 'grid-lines')
    //.attr("class", "gridline")
    .attr("stroke", "#9ca5aecf")
    .attr("stroke-dasharray","4")
    .selectAll('line')
    .data(yScale.ticks())
    .join('line')
    .attr('x1', margin.left)
    .attr('x2', width - margin.right)
    .attr('y1', d => yScale(d))
    .attr('y2', d => yScale(d));

  // Step 4. Define the line function.
  const line = d3.line()
    .defined(d => !isNaN(d.value))
    .x(d => xScale(d.date))
    .y(d => yScale(d.value))
    .curve(d3.curveStepAfter);

  // Step 5. Draw the SVG.
    // First let's create an empty SVG.
  const svg = d3.select('#' + element_id_for_linear_chart)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

    // Draw the x and y axes.
  svg.append('g').call(xAxis)
  svg.append('g').call(yAxis)

  svg.append('g').call(xGrid);
  svg.append('g').call(yGrid);

  
  svg.append("path")
    .datum(data)
    .attr("fill", "#64a3ff")
    .attr("stroke", "none")
    .attr("d", d3.area()
      .x(d => xScale(d.date))
      .y0(height - margin.bottom)
      .y1(d => yScale(d.value))
      .curve(d3.curveStepAfter)
    )

    // Draw the line.
  svg.append('path')
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#307cfd")
    .attr("stroke-width", 1)
    .attr('d', line);

  //ANALYTICS_PORTAL_SDK_refresh_stats_for_chart_id_(chart_id, config.aggr, config.aggr_unit, config.min, config.max, config.median);
}

/*
function ANALYTICS_PORTAL_SDK_refresh_stats_for_chart_id_(chart_id, aggr, aggr_unit, min, max, median) {
  document.getElementById('linear_chart_stats').style.display = 'table'; // make visible, invisible by default for no data case

  //const em = {'min': min, 'median': median, 'max': max, 'aggregation interval': aggr + ' ' + aggr_unit};
  const em = {'min': min, 'median': median, 'max': max};
  for (let i in em) {
    let el = document.getElementById(i);
    if (em[i] != undefined && em[i] != 'undefined undefined') // yes, 2 times undefined
      el.innerText = em[i];
    else
      el.innerText = '-';
  }
}
*/

function ANALYTICS_PORTAL_SDK_draw_dropdown_options(element_id, options, selected_option, types, labels) {
  //console.log(element_id)
  let html = '';
  if (element_id == 'drpd:topic')
    ;
  else if (element_id == 'drpd:url_domain_name')
    html += '<option value="">-- any domain --</option>';
  else if (element_id == 'drpd:url_path')
    html += '<option value="">-- any page --</option>';
  else
    html += '<option value="[\'\']">-- any element --</option>';

  let em = {};
  let new_options = [];
  for (let i in options) {
    let option = options[i];
    let new_option = option;
    if (types) {
      let type = types[i];
      if (type == 'anchor') type = 'link';
      if (type == 'select-one') type = 'dropdown';
      if (type != 'group' && type !== undefined)
        new_option = option + ' (' + type + ')';
      else if (type === undefined)
        new_option = option;
      else
        new_option = ' ' + option + ' ...';
    }
    em[new_option] = option;
    new_options.push(new_option);
  }

  for (let i in new_options) {
    let new_option = new_options[i];
    let option = em[new_option];
    html += '<option value="' + option + '"';
    if (option == selected_option)
      html += ' selected';
    html += '>';
    if (labels)
      html += labels[i];
    else
      html += new_option;
    html += '</option>';
  }
  
  const drpd_element = document.getElementById(element_id);
  drpd_element.innerHTML = html;

  //if (options.length <= 1 && element_id != 'drpd:element')
  if (options.length < 1 && element_id == 'drpd:element')
    drpd_element.parentElement.style.display = 'none';
  else if (options.length <= 1 && element_id != 'drpd:element' && element_id != 'drpd:url_path')
    drpd_element.parentElement.style.display = 'none';
  else
    drpd_element.parentElement.style.display = 'unset';
}

function ANALYTICS_PORTAL_SDK_refresh_topics(kwargs) {
  const topics = kwargs.topics_match_ctag;
  const currently_selected = kwargs.current_topic;

  ANALYTICS_PORTAL_SDK_draw_dropdown_options('drpd:topic', topics, currently_selected);
}

function ANALYTICS_PORTAL_SDK_draw_elements_hierarchy(kwargs) {
  const elements_hierarchy = kwargs['elements_hierarchy__all'];
  const element_path = kwargs['element_path'];
  let parent = document.getElementById('element_path');
  let html = '<label for="drpd:element" class="form-label no-margin-bottom custom-label">Page element:</label>';
  let id = 'drpd:element';
  html += '<select id="' + id + '" class="form-control form-select element_path margin-bottom-5" data-dtu="Page element"></select>';
  parent.innerHTML = html;

  let options = [];
  let types = [];
  let paths = [];
  for (let i = 1; i < elements_hierarchy.length; i++) {
    let element_path = elements_hierarchy[i];
    let offset = element_path.offset;
    let option = element_path.element;
    let type = element_path.type;
    if (type == 'anchor') type = 'link';
    if (type == 'select-one') type = 'dropdown';  
    let counter = element_path.number_of_calls;
    let path = element_path.element_path_string;
    options.push(offset + option + ' (' + type + ')');
    types.push(type);
    paths.push(path.replace(/"/g, "'"));
  }
  let selected_option = JSON.stringify(element_path).replace(/"/g, "'");
  ANALYTICS_PORTAL_SDK_draw_dropdown_options(id, paths, selected_option, types, options);
}

function ANALYTICS_PORTAL_SDK_get_datatable(table_id, data_type) { // https://datatables.net/manual/tech-notes/3#Object-instance-retrieval
  if ($.fn.dataTable.isDataTable('#' + table_id))
    return $('#' + table_id).DataTable();
  else
    return ANALYTICS_PORTAL_SDK_init_datatable(table_id, data_type);
}

function ANALYTICS_PORTAL_SDK_init_datatable(table_id, data_type) {
  if (['elements_interactions_table__in', 'elements_interactions_table__out'].includes(table_id))
    return ANALYTICS_PORTAL_SDK_init_elements_interactions_table(table_id, data_type);
  else if (['uids_interactions_table__in', 'uids_interactions_table__out'].includes(table_id))
    return ANALYTICS_PORTAL_SDK_init_uids_interactions_table(table_id, data_type);
  else
    console.error('unknown datatable:', table_id)
}

function ANALYTICS_PORTAL_SDK_init_uids_interactions_table(table_id, data_type) {
  return new DataTable('#' + table_id, {
    "createdRow": function(row, data, dataIndex) {
      let color = '#64a2ff';
      let icon = '🟦 ';
      if (data_type == 'out') {
        color = 'orangered';
        icon = '🟥 ';
      }

      let td_interactions = row.children[2];
      // background: linear-gradient(to right, gold 20%, gold 50%, skyblue 51%, skyblue 100%);
      //console.log(data)
      //td_interactions.setAttribute('style', 'background-size: ' + data[3] + '% 100%');
      let data_3 = data[3];
      data[3] = '🟨 ' + data[3];
      data[3] += ' compared to total number of interactions'
      let data_4 = data[4];
      data[4] = icon + data[4];
      data[4] += ' compared to UID with the largest number of interactions'
    
      td_interactions.setAttribute('style', 'background: linear-gradient(to right, gold 0%, gold ' + data_3 + ', ' + color + ' '+ data_3 + ', ' + color + ' ' + data_4 + ', transparent ' + data_4 + ', transparent 100%)');
      td_interactions.classList.add('percent');
    },
    "columnDefs": [
      {"visible": true, "targets": [0, 4]},
    ],
    "order": [[2, "desc"]],
    "columns": [
        { responsivePriority: 0, "orderable": false },
        { responsivePriority: 1, width: 100 },
        { responsivePriority: 2 },
        { responsivePriority: undefined, "className": "none" },
        { responsivePriority: undefined, "className": "none" },
    ],
    "language": {
      "zeroRecords": "No data",
    },
    "searching": false, 
    "paging": false, 
    "info": false,
    "bStateSave": true, // remember sorting
    "responsive": true,
  });
}

function ANALYTICS_PORTAL_SDK_init_elements_interactions_table(table_id, data_type) {
  return new DataTable('#' + table_id, {
    "createdRow": function(row, data, dataIndex) {
      //console.error(data)
      let color = '#64a2ff';
      let icon = '🟦 ';
      if (data_type == 'out') {
        color = 'orangered';
        icon = '🟥 ';
      }

      let td_element = row.children[2];
      td_element.setAttribute('title', data[4]);
      let td_interactions = row.children[3];
      // background: linear-gradient(to right, gold 20%, gold 50%, skyblue 51%, skyblue 100%);
      let data_6 = data[6];
      data[6] = '🟨 ' + data[6];
      data[6] += ' compared to total number of interactions'
      let data_7 = data[7];
      if (data_7 == icon + 'Relation to an element with the largest number of interactions is not applicable because "group" web-elements are synthetic')
        data_7 = '0%';
      else {
        data[7] = icon + data[7];
        data[7] += ' compared to an element with the largest number of interactions'
      }

      td_interactions.setAttribute('style', 'background: linear-gradient(to right, gold 0%, gold ' + data_6 + ', ' + color + ' '+ data_6 + ', ' + color + ' ' + data_7 + ', transparent ' + data_7 + ', transparent 100%)');

      //td_interactions.setAttribute('style', 'background-size: ' + data[6] + '% 100%');
      td_interactions.classList.add('percent');
    },
    "columnDefs": [
      {"visible": true, "targets": [0, 7]},
      {"visible": false, "targets": [4, 5]},
    ],
    "order": [[3, "desc"]],
    "columns": [
        { responsivePriority: 0, "orderable": false},
        { responsivePriority: 1 },
        { responsivePriority: 2 },
        { responsivePriority: 3 },
        null,
        null,
        { responsivePriority: undefined, "className": "none" },
        { responsivePriority: undefined, "className": "none" },
    ],
    "language": {
      "zeroRecords": "No data",
    },
    "searching": false, 
    "paging": false, 
    "info": false,
    "bStateSave": true, // remember sorting
    "responsive": true,
  });
}

function ANALYTICS_PORTAL_SDK_expand_datatable(table_id, number_of_records) {
  $('#' + table_id + '>tbody').css('display', 'table-row-group');
  localStorage.setItem(table_id + '_is_expanded', 'true');
  let table_toggler = document.getElementById('toggle_' + table_id);
  table_toggler.innerHTML = 'Collapse table';
  table_toggler.style.display = 'unset';
  if (number_of_records != null)
    document.getElementById('number_of_records_' + table_id).innerHTML = '(' + number_of_records + ' records)';
}

function ANALYTICS_PORTAL_SDK_collapse_datatable(table_id, number_of_records) {
  $('#' + table_id + '>tbody').css('display', 'none');
  localStorage.setItem(table_id + '_is_expanded', 'false');
  let table_toggler = document.getElementById('toggle_' + table_id);
  table_toggler.innerHTML = 'Expand table';
  table_toggler.style.display = 'unset';
  if (number_of_records != null)
    document.getElementById('number_of_records_' + table_id).innerHTML = '(' + number_of_records + ' records)';
}

function ANALYTICS_PORTAL_SDK_expand_collapse_datatable(table_id, number_of_records) {
  const datatable_is_expanded = localStorage.getItem(table_id + '_is_expanded');
  if (['false'].includes(datatable_is_expanded))
    ANALYTICS_PORTAL_SDK_collapse_datatable(table_id, number_of_records);
  else
    ANALYTICS_PORTAL_SDK_expand_datatable(table_id, number_of_records);
}

function ANALYTICS_PORTAL_SDK_toggle_table_display(table_id) {
  const datatable_is_expanded = localStorage.getItem(table_id + '_is_expanded');
  if ([null, 'false'].includes(datatable_is_expanded))
    ANALYTICS_PORTAL_SDK_expand_datatable(table_id);
  else
    ANALYTICS_PORTAL_SDK_collapse_datatable(table_id);
}

function ANALYTICS_PORTAL_SDK_refresh_uids_interactions_table(kwargs, data_type) {
  const uids = kwargs['uids__' + data_type];
  let rows = [];
  const max_number_of_calls = Object.values(uids).sort(function(a, b){return b - a})[0];
  const total_number_of_calls = kwargs['reports_match_user_filters__' + data_type + '_length'];

  for (let uid in uids) {
    let number_of_calls = uids[uid];
    rows.push([
      '', // icon
      uid, 
      number_of_calls, 
      Math.floor(number_of_calls * 100 / total_number_of_calls) + '%',
      Math.floor(number_of_calls * 100 / max_number_of_calls) + '%',
    ]);
  }

  const element_id_to_hide = 'uids__' + data_type;
  const element_to_hide = document.getElementById(element_id_to_hide);
  const element_id_to_show = 'uids__' + data_type + '_no_data';
  const element_to_show = document.getElementById(element_id_to_show);
  if (rows.length == 0) {
    element_to_hide.style.display = 'none';
    element_to_show.style.display = 'grid';
    element_to_show.innerHTML = '<span class="no-data">' + ANALYTICS_PORTAL_SDK_generate_no_data_message() + '</span>';
  }
  else {
    element_to_hide.style.display = 'block';
    element_to_show.style.display = 'none'; 
  }

  const table_id = 'uids_interactions_table__' + data_type;
  let table = ANALYTICS_PORTAL_SDK_get_datatable(table_id, data_type);

  //if (Object.keys(uids).length === 0)
  //  return;

  table.clear(); // https://stackoverflow.com/questions/27778389/how-to-manually-update-datatables-table-with-new-json-data
  table.rows.add(rows);
  table.columns.adjust().draw(); // doesn't work adjust https://datatables.net/reference/api/columns.adjust() so recalc width:
  $('#uids_interactions_table__' + data_type).css('width', '100%');

  ANALYTICS_PORTAL_SDK_expand_collapse_datatable(table_id, rows.length);
}

function ANALYTICS_PORTAL_SDK_refresh_elements_interactions_table(kwargs, data_type) {
  const elements_hierarchy = kwargs['elements_hierarchy__' + data_type];
  let new_rows = [];
  let max_number_of_calls = 0;
  let max_number_of_calls_no_groups = 0;
  for (let i in elements_hierarchy) {
    let element = elements_hierarchy[i];
    if (element.number_of_calls > max_number_of_calls)
      max_number_of_calls = element.number_of_calls;
    if (element.type == 'group')
      continue;
    if (element.number_of_calls > max_number_of_calls_no_groups)
      max_number_of_calls_no_groups = element.number_of_calls;
  }

  for (let i in elements_hierarchy) {
    let element = elements_hierarchy[i];
    let type = element.type;
    if (type == 'anchor') type = 'link';
    if (type == 'select-one') type = 'dropdown';
    let row = ['', type];
    if (element.element) 
      row.push(element.element);
    else
      row.push('All');
    row.push(element.number_of_calls);
    row.push('All' + element.element_path.join(' → '));
    row.push(element.element_path);
    row.push(Math.floor(element.number_of_calls * 100 / max_number_of_calls) + '%');

    let icon = '🟦 ';
    if (data_type == 'out')
      icon = '🟥 ';
    if (type == 'group')
      row.push(icon + 'Relation to an element with the largest number of interactions is not applicable because "group" web-elements are synthetic');// row.push(Math.floor(element.number_of_calls * 100 / max_number_of_calls));
    else
      row.push(Math.floor(element.number_of_calls * 100 / max_number_of_calls_no_groups) + '%');
    
    new_rows.push(row);
  }

  const element_id_to_hide = 'uids__' + data_type;
  const element_to_hide = document.getElementById(element_id_to_hide);
  const element_id_to_show = 'uids__' + data_type + '_no_data';
  const element_to_show = document.getElementById(element_id_to_show);
  if (new_rows.length == 0) {
    element_to_hide.style.display = 'none';
    element_to_show.style.display = 'grid';
    element_to_show.innerHTML = '<span class="no-data">' + ANALYTICS_PORTAL_SDK_generate_no_data_message() + '</span>';
  }
  else {
    element_to_hide.style.display = 'unset';
    element_to_show.style.display = 'none'; 
  }

  const table_id = 'elements_interactions_table__' + data_type;
  //$('#' + table_id + ' tbody').off('click'); // remove previously set listeners

  let table = ANALYTICS_PORTAL_SDK_get_datatable(table_id, data_type);
  //if (Object.keys(new_rows).length === 0)
  //  return;

  table.clear(); // https://stackoverflow.com/questions/27778389/how-to-manually-update-datatables-table-with-new-json-data
  table.rows.add(new_rows);
  table.columns.adjust().draw(); // doesn't work adjust https://datatables.net/reference/api/columns.adjust() so recalc width:
  $('#uids_interactions_table__' + data_type).css('width', '100%');

  ANALYTICS_PORTAL_SDK_expand_collapse_datatable(table_id, new_rows.length);
  /*
  $('#' + table_id + ' tbody').on('click', 'tr', function () {
    var data = table.row(this).data();
    if (data)
      ANALYTICS_PORTAL_SDK_update_page_elements_dropdown_value(data[4]);
  });
  */
}

function ANALYTICS_PORTAL_SDK_update_page_elements_dropdown_value(target_path) {
  let new_value = JSON.stringify(target_path).replace(/"/g, "'");
  const element = document.getElementById('drpd:element');
  element.value = new_value;
  let change = new Event('change'); // https://www.youtube.com/watch?v=RS-t3TC2iUo
  element.dispatchEvent(change);
}

function ANALYTICS_PORTAL_SDK_refresh_domain_urls(kwargs) {
  const domains = kwargs.url_domains_match_ctag_topic;
  const currently_selected = kwargs.current_domain;
  //console.log(domains)
  ANALYTICS_PORTAL_SDK_draw_dropdown_options('drpd:url_domain_name', domains, currently_selected)
}

function ANALYTICS_PORTAL_SDK_refresh_url_paths(kwargs) {
  const paths = kwargs.url_paths_match_url_domain;
  const currently_selected = kwargs.current_page;

  ANALYTICS_PORTAL_SDK_draw_dropdown_options('drpd:url_path', paths, currently_selected)
}

function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

function ANALYTICS_PORTAL_SDK_refresh_elements_page_data_according_to_user_filters_setup_with_delay() {
  sleep(0).then(() => { // wait till sdk send data into db
    ANALYTICS_PORTAL_SDK_refresh_elements_page_data_according_to_user_filters_setup();
  });
}

function ANALYTICS_PORTAL_SDK_display_screen(display_screen_id) {
  const screens = ['loading', 'app_content', 'instructions'];
  for (let i in screens) {
    let screen = screens[i];
    if (display_screen_id == screen)
      document.getElementById(screen).style.display = 'block';
    else
      document.getElementById(screen).style.display = 'none';
  }
}

function ANALYTICS_PORTAL_SDK_refresh_elements_page_data_according_to_user_filters_setup() {
  let user_filters = ANALYTICS_PORTAL_SDK_collect_user_filters_on_the_page();
  let kwargs = TX_API_process_user_filters_request(user_filters);

  if (kwargs.topics_match_ctag.length == 0) {
    ANALYTICS_PORTAL_SDK_display_screen('instructions');
    return;
  }  
  ANALYTICS_PORTAL_SDK_display_screen('app_content');

  //console.log(kwargs)
  //console.log(kwargs.elements_hierarchy)

  ANALYTICS_PORTAL_SDK_draw_elements_hierarchy(kwargs);
  ANALYTICS_PORTAL_SDK_make_element_dropdown_work();

  ANALYTICS_PORTAL_SDK_refresh_topics(kwargs);
  ANALYTICS_PORTAL_SDK_refresh_domain_urls(kwargs);
  ANALYTICS_PORTAL_SDK_refresh_url_paths(kwargs);

  ANALYTICS_PORTAL_SDK_get_data_for_sankey_chart(kwargs, 'in');
  ANALYTICS_PORTAL_SDK_draw_sankey_chart(kwargs, 'in');
  ANALYTICS_PORTAL_SDK_get_data_for_sankey_chart(kwargs, 'out');
  ANALYTICS_PORTAL_SDK_draw_sankey_chart(kwargs, 'out');

  ANALYTICS_PORTAL_SDK_refresh_elements_interactions_table(kwargs, 'in');
  ANALYTICS_PORTAL_SDK_refresh_uids_interactions_table(kwargs, 'in');
  ANALYTICS_PORTAL_SDK_refresh_elements_interactions_table(kwargs, 'out');
  ANALYTICS_PORTAL_SDK_refresh_uids_interactions_table(kwargs, 'out');

  ANALYTICS_PORTAL_SDK_draw_donut_chart(kwargs, 'uids'); // after tables because control of visibility there and if donut drawn on invisible object it is broken
  ANALYTICS_PORTAL_SDK_draw_donut_chart(kwargs, 'interactions');

  ANALYTICS_PORTAL_SDK_refresh_calls_over_time_for_chart_id_('elements_calls_over_time_chart_id', user_filters, kwargs);
}

function ANALYTICS_PORTAL_SDK_get_data_for_sankey_chart(kwargs, data_type) {
  const elements_hierarchy = kwargs['elements_hierarchy__' + data_type];
  //console.log(elements_hierarchy);
  let nodes_list = [];
  let nodes_dict = {}
  let paths = [];
  for (let i in elements_hierarchy) {
    let node_id = parseInt(i);
    let element = elements_hierarchy[i];
    let name = element['element'];
    if (name == '')
      name = 'All';
    nodes_list.push({"node": node_id, "name": name, "path": element['element_path']});
    nodes_dict[name] = node_id;
    paths.push({'path': element['element_path'], 'number_of_calls': element['number_of_calls']});
  }

  let links = [];
  for (let i in paths) {
    let p = paths[i];
    let path = p.path;
    if (path.length <= 1)
      continue;

    let path_length = path.length;
    let target = path[path_length - 1];
    let source = path[path_length - 2];
    if (source == '')
      source = 'All';
    let target_id = nodes_dict[target];
    let source_id = nodes_dict[source];
    let value = p.number_of_calls;
    links.push({"source": source_id, "target": target_id, "value": value});
  }

  //console.log(nodes_dict, links, paths)
  let data = {
    "nodes": nodes_list,
    "links": links
  };
  kwargs['sankey_chart_data__' + data_type] = data;
}

function ANALYTICS_PORTAL_SDK_get_elements_in_reports(kwargs) {
  // TODO: not in reports, but overall.
  let elements = [''];
  const reports_match_user_filters__in = kwargs['reports_match_user_filters__in'];
  for (let i in reports_match_user_filters__in) {
    let r = reports_match_user_filters__in[i];
    if (!elements.includes(r.element))
      elements.push(r.element);
  }
  return elements;
}

function ANALYTICS_PORTAL_SDK_get_random_item_from_number(number) {
  return Math.floor(Math.random()*number);
}
function ANALYTICS_PORTAL_SDK_get_random_item_from_list(list) { // https://stackoverflow.com/questions/5915096/get-a-random-item-from-a-javascript-array
  return list[ANALYTICS_PORTAL_SDK_get_random_item_from_number(list.length)];
}

function ANALYTICS_PORTAL_SDK_generate_no_data_message() {
  const idk_m = ['🤷‍♂️', '🤷🏻‍♂️', '🤷🏼‍♂️', '🤷🏽‍♂️', '🤷🏾‍♂️', '🤷🏿‍♂️'];
  const idk_f = ['🤷‍♀️', '🤷🏻‍♀️', '🤷🏼‍♀️', '🤷🏽‍♀️', '🤷🏾‍♀️', '🤷🏿‍♀️'];
  const idk = [].concat(idk_f).concat(idk_m);
  const random_idk_icon = ANALYTICS_PORTAL_SDK_get_random_item_from_list(idk);
  return '<span class="icon">' + random_idk_icon + '</span><br>' + 'No data';
}

function ANALYTICS_PORTAL_SDK_draw_sankey_chart(kwargs, data_type) { // https://d3-graph-gallery.com/graph/sankey_basic.html
  let sankey_chart_data = kwargs['sankey_chart_data__' + data_type];
  
  const element_id_to_hide = 'elements__' + data_type;
  const element_to_hide = document.getElementById(element_id_to_hide)
  const element_id_to_show = 'elements__' + data_type + '_no_data';
  const element_to_show = document.getElementById(element_id_to_show)
    
  if (sankey_chart_data.nodes.length == 0) {
    element_to_hide.style.display = 'none';
    element_to_show.style.display = 'grid';
    element_to_show.innerHTML = '<span class="no-data">' + ANALYTICS_PORTAL_SDK_generate_no_data_message() + '</span>';
    return;
  }
  else {
    element_to_hide.style.display = 'unset';
    element_to_show.style.display = 'none';
  }

  const element_id_for_sankey = 'sankey_chart__' + data_type;
  const element_with_sankey = document.getElementById(element_id_for_sankey);
  element_with_sankey.innerHTML = '';

  let node_padding = 20;
  if (sankey_chart_data.nodes.length > 15) {
    node_padding = 10;
  }

  let rect_color = '#0d6efdff';
  if (data_type == 'out')
    rect_color = 'orangered';

  let sankey_width = element_with_sankey.offsetWidth;
  let sankey_height = sankey_chart_data.nodes.length * 20;

  // set the dimensions and margins of the graph
  let margin = {top: 10, right: 0, bottom: 25, left: 0},
      width = sankey_width// - margin.left - margin.right,
      height = sankey_height// - margin.top - margin.bottom;  

  // format variables
  let formatNumber = d3.format(",.0f"), // zero decimal places
      format = function(d) { return formatNumber(d); },
      color = d3.scaleOrdinal(d3.schemeCategory10);
    
  // append the svg object to the body of the page
  let svg = d3.select("#" + element_id_for_sankey).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", 
            "translate(" + margin.left + "," + margin.top + ")");

  function left(node) {
    return node.depth;
  }

  function right(node, n) {
    return n - 1 - node.height;
  }

  function justify(node, n) {
    return node.sourceLinks.length ? node.depth : n - 1;
  }

  // Set the sankey diagram properties
  let sankey = d3.sankey()
      .nodeWidth(3)
      .nodePadding(node_padding)
      .size([width, height])
      .nodeAlign(left);

  let path = sankey.links();
  if (sankey_chart_data.nodes.length < 1)
    return;

  graph = sankey(sankey_chart_data);

  // add in the links
  let link = svg.append("g").selectAll(".link")
      .data(graph.links)
      .enter().append("path")
      .attr("class", "link")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke-width", function(d) { return d.width; });

  if (data_type == 'in') {
    link.on("click", function(d) {
      let target_path = d.target.__data__.target.path;
      ANALYTICS_PORTAL_SDK_update_page_elements_dropdown_value(target_path);
    })
  }

  // add the link titles
  link.append("title")
      .text(function(d) {
        return d.source.name + " → " + 
               d.target.name + "\n" + format(d.value) + " interactions"; });

  // add in the nodes
  var node = svg.append("g").selectAll(".node")
      .data(graph.nodes)
      .enter().append("g")
      .style("font", "13px sans-serif")
      .attr("class", "node");

  // add the rectangles for the nodes
  node.append("rect")
      .attr("x", function(d) { return d.x0; })
      .attr("y", function(d) { return d.y0; })
      .attr("height", function(d) { return d.y1 - d.y0; })
      .attr("width", sankey.nodeWidth())
      .style("fill", rect_color)
      .append("title")
      .text(function(d) { 
      return d.name + "\n" + format(d.value); });

  // add in the title for the nodes
  node.append("text")
      .attr("x", function(d) { return d.x0 - 6; })
      .attr("y", function(d) { return (d.y1 + d.y0) / 2; })
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .text(function(d) { return d.name; })
      .filter(function(d) { return d.x0 < width / 2; })
      .attr("x", function(d) { return d.x1 + 6; })
      .attr("text-anchor", "start")
}

function ANALYTICS_PORTAL_SDK_draw_donut_chart(kwargs, donut_name) {
  const element_id_for_donut = donut_name + '_donut';
  const element_with_donut = document.getElementById(element_id_for_donut);
  element_with_donut.innerHTML = '';

  // set the dimensions and margins of the graph
  const width = element_with_donut.offsetWidth * 1,
      height = width;

  // The radius of the pieplot is half the width or half the height (smallest one). I subtract a bit of margin.
  const radius = width / 4;

  // append the svg object to the div called 'my_dataviz'
  const svg = d3.select("#" + element_id_for_donut)
    .append("svg")
      .attr("width", width)
      .attr("height", height)
    .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

  let name = 'reports_match_user_filters';
  let data_color = '#64a2ff';
  let subtext = 'of all interactions';
  if (donut_name == 'uids') {
    data_color = 'mediumseagreen';
    subtext = 'of all unique UIDs';
    name = donut_name;
  }

  // Create data
  const in_length = kwargs[name + '__in_length'];
  const all_length = kwargs[name + '__all_length'];
  let start = all_length - in_length;
  if (start == 0)
    start = in_length / 1000; // to always draw vertical line at 12 o'clock but don't affect stats
  const data = {a: start, b: in_length};

  // set the color scale
  const color = d3.scaleOrdinal()
    .range(["#ccc8c8", data_color])
  // Compute the position of each group on the pie:
  const pie = d3.pie()
    .value(d=>d[1])

  const data_ready = pie(Object.entries(data))

  // Build the pie chart: Basically, each part of the pie is a path that we build using the arc function.
  svg
    .selectAll('whatever')
    .data(data_ready)
    .join('path')
    .attr('d', d3.arc()
      .innerRadius(radius)         // This is the size of the donut hole
      .outerRadius(1.8 * radius)
    )
    .attr('fill', d => color(d.data[0]))
    .attr("stroke", "snow")
    .style("stroke-width", "2px")
    //.style("opacity", 0.7)

  let text = (in_length * 100 / all_length).toFixed(1) + '%';
  svg.append("svg:text")
    .attr("dy", ".15em")
    .attr("text-anchor", "middle")
    .attr("font-size","28")
    //.attr("fill","#5CB85C")
    .text(text);

  svg.append("svg:text")
    .attr("dy", "2.2em")
    .attr("text-anchor", "middle")
    .attr("font-size","10")
    //.attr("fill","bl")
    .text(subtext);
}

ANALYTICS_PORTAL_SDK_start();
