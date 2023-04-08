//import("src/web/common/chartjs/chart-4.2.1.js");
//import("src/web/common/chartjs/chartjs-adapter-date-fns-3.0.0.bundle.min.js");

// to adjuste phrase "all the marked with "data-dtu" elements on <better_phrase> website"
//let better_phrase = ''; //'this resource';
//if (window.location.hostname == 'dotheyuse.com')
//  better_phrase = ' on this web site';
const drpd_elements_all = '-- all the monitored elements --';// + better_phrase + ' --';

const ctag = "DEMO MVP"; // somehow via session ID mapping in DB, not in request

function ANALYTICS_PORTAL_SDK_get_chart_size(chart_id) {
  const chart = Chart.getChart(chart_id);
  let chart_width_px = chart.canvas.style.width; // Math.floor(chart.chartArea.width); - not work due to constant recalcs, so, base on canvas.style.width
  chart_width_px = chart_width_px.slice(0, chart_width_px.length - 2); // cut 'px'
  return parseInt(chart_width_px);
}

function ANALYTICS_PORTAL_SDK_format_date_time_for_filter(date_time) {
  date = new Date(date_time).toLocaleDateString('en-GB').split('/');
  time = new Date(date_time).toLocaleTimeString('en-GB');
  return date[2] + '-' + date[1] + '-' + date[0] + 'T' + time;
}

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
      ANALYTICS_PORTAL_SDK_refresh_elements_page_data_according_to_user_filters_setup();
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

  const datetime_to = Date.parse(new Date());
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
  }
  user_filters["element_path"] = in_page_path;

  //console.log(user_filters)
  return user_filters;
}

function ANALYTICS_PORTAL_SDK_get_datatable() { // https://datatables.net/manual/tech-notes/3#Object-instance-retrieval
  console.log($.fn.dataTable.isDataTable('#datatable'))
  if ($.fn.dataTable.isDataTable('#datatable'))
    return $('#datatable').DataTable();
  else
    return ANALYTICS_PORTAL_SDK_init_datatable();
}

function ANALYTICS_PORTAL_SDK_init_datatable() {
  return new DataTable('#datatable', {
    "columnDefs": [
      {
        "targets": [0, 1],
        "className": 'dt-body-left'
      }
    ],
    "order": [[2, "desc"]],
    "columns": [
      { "width": "50%" },
      { "width": "auto" },
      null
    ],
    "searching": false, 
    "paging": false, 
    "info": false
  });
}

function ANALYTICS_PORTAL_SDK_start() {
  // detect which tab now is opened and update accordingly
  ANALYTICS_PORTAL_SDK_init_calls_over_time_chart_for_('elements_calls_over_time_chart_id');
  ANALYTICS_PORTAL_SDK_init_time_shortcut_listeners();

  ANALYTICS_PORTAL_SDK_refresh_elements_page_data_according_to_user_filters_setup();
  
  // add listeners
  ANALYTICS_PORTAL_SDK_make_dropdowns_work();
  // ANALYTICS_PORTAL_SDK_make_element_dropdown_work();
  // ANALYTICS_PORTAL_SDK_make_reset_filters_button_work();
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

      ANALYTICS_PORTAL_SDK_refresh_elements_page_data_according_to_user_filters_setup();
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
      ANALYTICS_PORTAL_SDK_refresh_elements_page_data_according_to_user_filters_setup();
      element.removeAttribute("changed");
    });
  }
}

function ANALYTICS_PORTAL_SDK_init_calls_over_time_chart_for_(chart_id) {
  const config = {
    type: 'line',
    data: {
      datasets: [{
          borderWidth: 1,
          tension: 0.2,
          backgroundColor: '#f6f6b788',
          fill: false
        },
        {
          borderWidth: 2,
          tension: 0.2,
          //borderColor: '#058dc7',
          borderColor: '#0d6efdbb',
          //borderColor: '#777777',
          //backgroundColor: '#e7f4f988',
          backgroundColor: '#f6f6b788',
          fill: '-1',
        },
        {
          borderWidth: 1,
          tension: 0.2,
          //backgroundColor: '#e7f4f999',
          backgroundColor: '#f6f6b788',
          fill: '-1'
        }
      ]
    },
    options: {
      elements: {
        line: {
          fill: false
        },
        point: {
          radius: 0,
        },
      },
      scales: {
        y: {
          //display: false,
          //min: 0,
          //suggestedMin: 2,
          beginAtZero: true, 
          title: {
            display: false,
          },
          ticks: {
            precision: 0,
            //stepSize: 1,
          }
        },
        x: {
          type: 'time',
          time: {
            //unit: 'minute',
            displayFormats: {
              second: 'HH:mm:ss',
              minute: 'HH:mm',
              hour: 'HH:mm',
            }
          },
          title: {
            display: false,
            text: "time", 
          },
          ticks: {
            display: true,
            crossAlign: 'far'
            //source: 'data',
            //stepSize: 1,
          }
        },
      },
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 1,
      layout: {
        //autoPadding: false,
        //padding: 100
      },
      plugins: {
        legend: {
          display: false,
          position: "right",
          maxWidth: 1000,
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            padding: 8,
            usePointStyle: true,
          }
        },
        title: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label;
            }
          }
        },
      }
    },
    plugins: [{
      afterDraw: function(chart) { // https://stackoverflow.com/questions/55564508/pie-chart-js-display-a-no-data-held-message
        try {
          if (chart.data.datasets[0].data.length == 0) {
            ANALYTICS_PORTAL_SDK_display_message_on_chart(chart, 'No data to display for current filter condition(s)');
          }
        } 
        catch (error) {
          let message = 'An error occured while trying to draw the chart'
          ANALYTICS_PORTAL_SDK_display_message_on_chart(chart, message);
        }
      },
    }]
  };
  
  if ('elements_calls_over_time_chart_id' == chart_id) {
    config.options.scales.y.title.text = "# of calls for selected element(s) at the same time";
    config.options.plugins.title.text = "Median calls (with max and min bursts) for the selected element in time";
  }
  //config.options.animations = false;

  const chart_element = document.getElementById(chart_id);
  new Chart(chart_element, config);   
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
  const chart_width_px = ANALYTICS_PORTAL_SDK_get_chart_size(chart_id);
  const reports_match_user_filters_length = kwargs['reports_match_user_filters_length'];
  let config = {};
  if (reports_match_user_filters_length == 0)
    config = {'labels': [], 'data': [], 'unit': 'second', 'step_size': 1}; // no data case
  else
    config = TX_API_get_data_for_chart_(chart_width_px, user_filters, kwargs);          

  let chart = Chart.getChart(chart_id);
  chart.config.data.labels = config.labels;

  chart.config.data.datasets[0].data = config.data.mins;
  chart.config.data.datasets[1].data = config.data.medians;
  chart.config.data.datasets[2].data = config.data.maxes;
  chart.config.options.scales.x.time.unit = config.unit;
  chart.config.options.scales.x.ticks.stepSize = config.step_size;
  chart.update();

  ANALYTICS_PORTAL_SDK_refresh_stats_for_chart_id_(chart_id, config.aggr, config.aggr_unit, config.min, config.max, config.median);
}

function ANALYTICS_PORTAL_SDK_refresh_stats_for_chart_id_(chart_id, aggr, aggr_unit, min, max, median) {
  const em = {'min': min, 'median': median, 'max': max, 'aggregation interval': aggr + ' ' + aggr_unit};
  for (let i in em) {
    let el = document.getElementById(i);
    if (em[i] != undefined && em[i] != 'undefined undefined') // yes, 2 times undefined
      el.innerText = em[i];
    else
      el.innerText = '-';
  }
}

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
      if (type != 'has children' && type !== undefined)
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
  else if (options.length <= 1 && element_id != 'drpd:element')
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
  const elements_hierarchy = kwargs['elements_hierarchy'];
  const element_path = kwargs['element_path'];
  let parent = document.getElementById('element_path');
  let html = '<label for="drpd:element" class="form-label no-margin-bottom custom-label">Page element(s):</label>';
  let id = 'drpd:element';
  html += '<select id="' + id + '" class="form-control form-select element_path margin-bottom-5" data-dtu="Page element(s)"></select>';
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

function ANALYTICS_PORTAL_SDK_refresh_datatable(kwargs) {
  const elements_hierarchy = kwargs['elements_hierarchy'];
  let new_rows = [];
  for (let i in elements_hierarchy) {
    let element = elements_hierarchy[i];
    let row = ['All' + element.element_path.join(' → ')];
    if (element.element)
      row.push(element.element);
    else
      row.push('All');
    row.push(element.number_of_calls);
    new_rows.push(row);
  }
  let table = ANALYTICS_PORTAL_SDK_get_datatable();
  table.clear()
  table.rows.add(new_rows)
  table.draw();
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

function ANALYTICS_PORTAL_SDK_refresh_elements_page_data_according_to_user_filters_setup() {
  let user_filters = ANALYTICS_PORTAL_SDK_collect_user_filters_on_the_page();
  let kwargs = TX_API_process_user_filters_request(user_filters);

  //console.log(user_filters)
  //console.log(kwargs.elements_hierarchy)

  ANALYTICS_PORTAL_SDK_draw_elements_hierarchy(kwargs);
  ANALYTICS_PORTAL_SDK_make_element_dropdown_work();

  ANALYTICS_PORTAL_SDK_refresh_topics(kwargs);
  ANALYTICS_PORTAL_SDK_refresh_domain_urls(kwargs);
  ANALYTICS_PORTAL_SDK_refresh_url_paths(kwargs);

  ANALYTICS_PORTAL_SDK_refresh_calls_over_time_for_chart_id_('elements_calls_over_time_chart_id', user_filters, kwargs);

  ANALYTICS_PORTAL_SDK_get_data_for_sankey_chart(kwargs);
  ANALYTICS_PORTAL_SDK_draw_sankey_chart(kwargs);

  ANALYTICS_PORTAL_SDK_refresh_datatable(kwargs);  
}

function ANALYTICS_PORTAL_SDK_get_data_for_sankey_chart(kwargs) {
  const elements_hierarchy = kwargs['elements_hierarchy'];
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
  kwargs['sankey_chart_data'] = data;
}

function ANALYTICS_PORTAL_SDK_get_elements_in_reports(kwargs) {
  // TODO: not in reports, but overall.
  let elements = [''];
  const reports_match_user_filters = kwargs['reports_match_user_filters'];
  for (let i in reports_match_user_filters) {
    let r = reports_match_user_filters[i];
    if (!elements.includes(r.element))
      elements.push(r.element);
  }
  return elements;
}

function ANALYTICS_PORTAL_SDK_draw_sankey_chart(kwargs) { // https://d3-graph-gallery.com/graph/sankey_basic.html
  const element_id_for_sankey = 'sankey_chart';
  const element_with_sankey = document.getElementById(element_id_for_sankey);
  element_with_sankey.innerHTML = '';

  let node_padding = 20;
  let sankey_chart_data = kwargs['sankey_chart_data'];
  if (sankey_chart_data.nodes.length > 15) {
    node_padding = 5;
  }

  let sankey_width = element_with_sankey.offsetWidth - 20; // don't know why -24, why scroll appears
  let sankey_height = sankey_chart_data.nodes.length * 15//300;

// set the dimensions and margins of the graph
var margin = {top: 20, right: 0, bottom: 25, left: 0},
    width = sankey_width// - margin.left - margin.right,
    height = sankey_height// - margin.top - margin.bottom;  

// format variables
var formatNumber = d3.format(",.0f"), // zero decimal places
    format = function(d) { return formatNumber(d); },
    color = d3.scaleOrdinal(d3.schemeCategory10);
  
// append the svg object to the body of the page
var svg = d3.select("#" + element_id_for_sankey).append("svg")
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
var sankey = d3.sankey()
    .nodeWidth(3)
    .nodePadding(node_padding)
    .size([width, height])
    .nodeAlign(left);

var path = sankey.links();
if (sankey_chart_data.nodes.length < 1)
  return;

graph = sankey(sankey_chart_data);

// add in the links
  var link = svg.append("g").selectAll(".link")
      .data(graph.links)
      .enter().append("path")
      .attr("class", "link")
      .attr("d", d3.sankeyLinkHorizontal())
      .style("cursor", "pointer")
      .attr("stroke-width", function(d) { return d.width; });  

link.on("click", function(d) {
  let target_path = d.target.__data__.target.path;
  const element = document.getElementById('drpd:element');
  let current_element_value = element.value;
  let new_value = JSON.stringify(target_path).replace(/"/g, "'");
  element.value = new_value;
  let change = new Event('change'); // https://www.youtube.com/watch?v=RS-t3TC2iUo
  element.dispatchEvent(change);
})

// add the link titles
  link.append("title")
      .text(function(d) {
            return d.source.name + " → " + 
                   d.target.name + "\n" + format(d.value) + " items"; })
      .style("cursor", "pointer");

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
      .style("fill", '#0d6efdff')
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

ANALYTICS_PORTAL_SDK_start();
