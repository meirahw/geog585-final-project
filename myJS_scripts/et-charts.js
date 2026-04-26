"use strict";

var PATH_CSV = "./data/RipMapET_AllYears_Long_Update_202060406.csv";
var format = d3.format(".1f");

// load + process data
var ETDataByPolygon = new Array();

d3.csv(PATH_CSV, d => ({
    PolyID: +d.PolyID,
    year: +d.year,
    mean: +d.mean,
    p25: +d.p25,
    p75: +d.p75,
    npix: +d.npix
})).then(data => {

    // group data
    var grouped = d3.group(data, d => d.PolyID);

    // sort each group's time series
    grouped.forEach(arr => {
        arr.sort((a, b) => a.year - b.year);
    });

    // store data
    ETDataByPolygon = grouped;
});

function drawETChart(data) {

    d3.select("#et-chart-wrapper .et-placeholder")
        .style("display", "none");

    // create ET tooltip
    var ETTooltip = d3.select("body")
        .selectAll(".et-tooltip")
        .data([null])
        .join("div")
        .attr("class", "et-tooltip")
        .style("position", "absolute")
        .style("opacity", 0);

    // mouseover function shows year, mean, p25, and p75
    // ChatGPT was used to help write 
    var mouseover = function (event, d) {

        var cx = +d3.select(this).attr("cx");
        var cy = +d3.select(this).attr("cy");
        var svgRect = this.ownerSVGElement.getBoundingClientRect();

        var left = svgRect.left + window.scrollX + cx;
        var top = svgRect.top + window.scrollY + cy - 1; // small gap

        ETTooltip
            .style("opacity", 1)
            .style("left", left + "px")
            .style("top", top + "px")
            .html(`
            <b>Year:</b> ${d.year}<br>
            <b>Mean:</b> ${format(d.mean)} mm<br>
            <b>P25:</b> ${format(d.p25)} mm<br>
            <b>P75:</b> ${format(d.p75)} mm
        `);

        d3.select(this).style("stroke", "black");
    };

    // tooltip disappears (opacity: 0) and black out
    var mouseleave = function (event, d) {
        ETTooltip
            .style("opacity", 0)
        d3.select(this)
            .style("stroke", "none")
    }

    // select chart and get width of client browser
    var container = document.querySelector("#et-chart");
    var containerWidth = container.clientWidth;
    var containerHeight = container.clientHeight;

    var margin = { top: 10, right: 10, bottom: 40, left: 40 };

    var minChartWidth = 300;
    var width = containerWidth - margin.left - margin.right;
    var height = containerHeight - margin.top - margin.bottom;
    
    // clear old chart, if any
    d3.select("#et-chart").html("");

    // svg
    var svg = d3.select("#et-chart")
        .append("svg")
        .attr("width", containerWidth - 4)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // scales
    var x = d3.scalePoint()
        .domain(data.map(d => d.year))
        .range([0, width])
        .padding(0.2);

    var y = d3.scaleLinear()
        .domain([
            d3.min(data, d => d.p25),
            d3.max(data, d => d.p75)
        ])
        .nice()
        .range([height, 0]);

    // axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(y).ticks(5));

    // generators
    var area = d3.area()
        .x(d => x(d.year))
        .y0(d => y(d.p75))
        .y1(d => y(d.p25));

    var line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.mean));

    // ribbon
    svg.append("path")
        .datum(data)
        .attr("fill", "#cce5df")
        .attr("d", area);

    // line
    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", line);

    // points
    svg.selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.mean))
        .attr("r", 4)
        .attr("fill", "steelblue")
        // mouse actions
        .on("mouseover", mouseover)
        .on("mouseleave", mouseleave)
};
