function Waterfall(canvas, data, screen_width, screen_height){
    var _self = this;
    _self.canvas = canvas;
    _self.fontSize = 27;
    _self.value_array = [.75, .75, .75];
    _self.data = data["data"];
    _self.traj = data["traj"];
    _self.dataset = data["dataset"];
    _self.original_data = $.extend(true, {}, _self.data);
    _self.state_keys = _self.data.map(d=>d["state"]).filter(onlyUnique).sort((a,b)=>d3.ascending(parseInt(a),parseInt(b)));
    _self.patient_keys = _self.data.map(d=>d[SUBJID]).filter(onlyUnique).sort((a,b)=>d3.ascending(parseInt(a),parseInt(b)));
    _self.margin = {top: screen_height*.1, right: screen_width*.15, bottom: screen_height*.05, left: screen_width*.25},
    _self.screen_width = screen_width,
    _self.screen_height = screen_height,
    _self.width = screen_width - _self.margin.left - _self.margin.right,
    _self.height = screen_height - _self.margin.top - _self.margin.bottom;
    _self.color = COLOR_FUNCTION;
    _self.color.domain(_self.state_keys);
    _self.statescale = d3.scalePoint().domain(_self.state_keys).range([0, _self.height]).padding(0.2);
    _self.radius = 1.5;

    _self.timescale = d3.scaleLinear().domain([0, d3.max(_self.data, function(e){return e["age"]})]).range([0, _self.width]);
    _self.timescale = d3.scaleLinear().domain([0, 25]).range([0, _self.width]);

    _self.svg = d3.select(canvas)
        .append("svg")
          .attr("class", "pathview")
          .attr("width", screen_width)
          .attr("height", screen_height)
        .append("g")
          .attr("transform", "translate(" + _self.margin.left + "," + _self.margin.top + ")");

    _self.bgrect = _self.svg
      .append("rect")
        .attr("class", "reset")
        .attr("x", -_self.margin.left)
        .attr("y", -_self.margin.top)
        .attr("width", _self.screen_width)
        .attr("height", _self.screen_height*.98)
        .style("fill", "black")
        .style("opacity", 1);

    _self.axis_space = _self.svg
      .append("g")
      .attr("class", "xaxis")
      .attr("transform","translate(0, " + -_self.margin.top/2 + ")")
      .call(d3.axisTop(_self.timescale));

    _self.axis_space.selectAll("text")
        .style("font-size", _self.fontSize + "px")
        .style("fill", "white");

    _self.axis_space.selectAll("path")
        .style("stroke", "white");

    _self.axis_space.selectAll("line")
        .style("stroke", "white");

    _self.svg
      .append("text")
        .attr("class", "axisLabel")
        .attr("x", _self.width)
        .attr("y", -_self.margin.top)
        .style("font-size", _self.fontSize + "px")
        .style("fill", "white")
        .style("dominant-baseline", "hanging")
        .style("text-anchor", "end")
        .text("Age in Years");

    _self.drawTrajectory();
    _self.drawTrajSummaryTable();
    _self.drawTrajName();
}

Waterfall.prototype.drawTrajectory = function() {
  var _self = this;

  _self.data.forEach(function(d,i){
    d["x"] = _self.timescale(d["age"]);
    d["y"] = _self.statescale(d["state"]);
  });

  var line = d3.line()
    .curve(d3.curveCatmullRom.alpha(0.5))
    .x(function(d){return d.x})
    .y(function(d){return d.y});

  var filtered = $.extend(true, [], _self.data);
      
  var nodes = d3.values(_.groupBy(filtered, d=>d[SUBJID])).map(filter_only_transitions).filter(function(e){return e.length >= 2});

  var count = 0;
  var edges = [];
  for (var i = 0; i < nodes.length; i++) {
    for (var j = 0; j < nodes[i].length; j++) {
      if(j < nodes[i].length - 1){
        var obj = {'source': count, 'target': count+1};
        edges.push(obj);
      }
      count++;
    }
  }

  var nodes_flat = nodes.flat().map(function(k){return {'x': _self.timescale(k["age"]), 'y': _self.statescale(k["state"]), 'state': k["state"]}});

  results = [];
  edges.forEach(function(e, eindex){
    var array = [];
    array.push(nodes_flat[e["source"]]);
    array.push(nodes_flat[e["target"]]);
    results.push(array);
  })

  _self.trajPath = _self.svg.append("g")
      .attr("class", "cells")
      .selectAll("path")
      .data(results).enter()
    .append("path")
      .attr("class", "visit_path")
      .attr("d", line)
      .style("fill", "none")
      .style("opacity", _self.value_array[1])
      .style("stroke-width", 1)
      .style("stroke", function(e){return _self.color(e[0]['state'])});

  _self.cell = _self.svg
      .selectAll("circle.cell")
      .data(_self.data).enter()
    .append("circle")
      .attr("class", "cell")
      .attr("r", _self.radius)
      .attr("cx", d=>d.x)
      .attr("cy", d=>d.y)
      .style("opacity", _self.value_array[0])
      .style("stroke", d=>(d["ground truth"]==1)?"white": "none")
      .style("stroke-width", _self.radius*.5)
      .style("fill", d=>_self.color(d["state"]));

  var simData = $.extend(true, {}, _self.data);
  var startTime = Date.now();
  var timeout = 10;
  var count = 0;
  var simulation = d3.forceSimulation(_self.data)
      .force("x", d3.forceX(function(d) { return _self.timescale(d["age"]); }).strength(.9))
      .force("y", d3.forceY(function(d){return _self.statescale(d["state"]);}).strength(.1))
      .force("collide", d3.forceCollide(_self.radius*1.5))
      .on("tick", function(d,i){
        if(count < timeout){
          if((Date.now() - startTime) % 1000 > count){
            _self.cell
              .attr("cx", (d,i)=>d.x)
              .attr("cy", (d,i)=>d.y);
            count+=1;
          }
        }else{
          simulation.stop();
          _self.cell
              .attr("cx", (d,i)=>d.x)
              .attr("cy", (d,i)=>d.y);
        }
      })
      .on("end", function(){
        _self.cell
              .attr("cx", (d,i)=>d.x)
              .attr("cy", (d,i)=>d.y);
      });

  for (var i = 0; i < 30; ++i) simulation.tick();

};

Waterfall.prototype.drawTrajSummaryTable = function() {
  var _self = this;
  var margin = {'left': 20, 'right': 20};
  var table_width = _self.margin.left - margin.left - margin.right-10;
  var keys = d3.keys(_self.traj["all"]["trajsum"][0]);
  var cell_width = table_width/keys.length;
  var cell_height = _self.statescale.step();

  _self.table = _self.svg
      .append("g")
        .attr("class", "table")
        .attr("transform", "translate(" + -(_self.margin.left-margin.left) + ",0)");

  _self.trajTableRect = _self.table
      .append("rect")
        .attr("x", -margin.left)
        .attr("y", -_self.margin.top)
        .attr("width", _self.margin.left-margin.right)
        .attr("height", _self.screen_height)
        .style("fill", "white");

  _self.table_header = _self.table
        .selectAll("g.theader")
        .data(keys).enter()
      .append("g")
        .attr("class", "theader")
        .attr("transform", (d,i)=>"translate(" + i*cell_width + "," + -(_self.margin.top/2+cell_height/2) + ")");

  _self.table_header_rect = _self.table_header
      .append("rect")
        .attr("width", cell_width)
        .attr("height", (_self.margin.top/2+cell_height/2))
        .style("fill", "white")
        .style("stroke", "black");

  _self.table_header_text = _self.table_header
      .append("text")
        .attr("x", cell_width/2)
        .attr("y", (_self.margin.top/2 + cell_height/2)/2)
        .style("text-anchor", "middle")
        .style("font-weight", 900)
        .text((d,i)=>(i==0)? "": d);

  _self.table_rows = _self.table
        .selectAll("g.row")
        .data(_self.traj["all"]["trajsum"]).enter()
      .append("g")
        .attr("class", "row")
        .attr("transform", (d,i)=>"translate(0," + _self.statescale(i) + ")");

  _self.table_cell = _self.table_rows
        .selectAll("g.cell")
        .data((d,i)=>keys.map(k=>{return {"value": d[k], "index": i}})).enter()
      .append("g")
        .attr("class", "cell")
        .attr("transform", (d,i)=>"translate(" + i*cell_width + ", 0)");

  _self.table_rect = _self.table_cell
      .append("rect")
        .attr("y", -cell_height/2)
        .attr("width", cell_width)
        .attr("height", cell_height)
        .style("fill", (d,i)=>(i>=1 && i <= 3)? STATE_COLOR(Math.round((d["value"] + Number.EPSILON) * 100) / 100): "white")
        .style("stroke", "black");

  _self.table_text = _self.table_cell
      .append("text")
        .attr("x", cell_width/2)
        .style("text-anchor", "middle")
        .style("dominant-baseline", "middle")
        .style("fill", "black")
        .style("font-weight", (d,i)=> i==0? 900 : "normal")
        .text((d,i)=>(i>=1 && i <= 3)? Math.round((d["value"] + Number.EPSILON) * 100) / 100: d["value"]);

  var trajkeys = d3.keys(_self.traj['tr-state']);

  _self.trajDivider = _self.table
        .selectAll("line.divider")
        .data(trajkeys.slice(1)).enter()
      .append("line")
        .attr("class", "divider")
        .attr("x1", 0)
        .attr("x2", table_width)
        .attr("y1", (d,i)=>_self.statescale(_self.traj['tr-state'][d][0])-cell_height/2)
        .attr("y2", (d,i)=>_self.statescale(_self.traj['tr-state'][d][0])-cell_height/2)
        .style("stroke", "black")
        .style("stroke-width", 5)

};

Waterfall.prototype.drawTrajName = function() {
  var _self = this;
  var margin = {'left': 10, 'right': 10};
  var table_width = _self.margin.left - margin.left - margin.right;
  var keys = d3.keys(_self.traj["all"]["trajsum"][0]);
  var cell_width = table_width/keys.length;
  var cell_height = _self.statescale.step();

  _self.trajNameSpace = _self.svg
      .append("g")
        .attr("class", "table")
        .attr("transform", "translate(" + (_self.width + margin.left) + ", 0)");

  _self.trajNameRect = _self.trajNameSpace
      .append("rect")
        .attr("y", -_self.margin.top)
        .attr("width", _self.margin.right-margin.left)
        .attr("height", _self.screen_height)
        .style("fill", "white");

  var keys = d3.keys(_self.traj['tr-state']);
  var trajnames = _self.traj['trajname'];

  _self.trajName = _self.trajNameSpace
        .selectAll("g.trjname")
        .data(keys).enter()
      .append("g")
        .attr("transform", (d,i)=>"translate(0," + _self.statescale(_self.traj['tr-state'][d][0]) + ")");

  _self.trajName.each(function(d,i){

    var line = d3.line()
      .x(function(d){return d.x})
      .y(function(d){return d.y});

    var x0 = 10;
    var x1 = 40;
    var y0 = 0;
    var y1 = (_self.statescale(_self.traj['tr-state'][d][_self.traj['tr-state'][d].length-1])-_self.statescale(_self.traj['tr-state'][d][0]));

    var datum = [{"x": x0, "y": y0}, {"x": x1, "y": y0}, {"x": x1, "y": y1}, {"x": x0, "y": y1}];

    d3.select(this)
      .append("path")
        .attr("d", line(datum))
        .style("fill", "none")
        .style("stroke", "black");

    d3.select(this)
    .append("text")
      .attr("x", _self.margin.right/2)
      .attr("y", y1/2)
      .style("text-anchor", "middle")
      .style("dominant-baseline", "middle")
      .selectAll("tspan")
      .data(["key", "N"]).enter()
    .append("tspan")
      .attr("x", _self.margin.right/2)
      .attr("y",(q,w)=>y1/2 + w*_self.fontSize - _self.fontSize)
      .style("font-weight", (d,i)=> (i == 0)? 900 : "normal")
      .text(function(q,w){
        if(w==0){
          return d;
        }else{
          return "N = " + _self.traj["all"]["trajcount"][d];
        }
      })
  })
};