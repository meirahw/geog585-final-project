"use strict";

var PATH_CSV = "./data/RipMapET_AllYears_Long_Update_202060406.csv";
const format = d3.format(".1f");

let currentETData = null;
// add tooltip


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

    // create ET tooltip
    var ETTooltip = d3.select("body")
        .selectAll(".et-tooltip")
        .data([null])
        .join("div")
        .attr("class", "et-tooltip")
        .style("position", "absolute")
        .style("opacity", 0);

    // mouseover function shows year, mean, p25, and p75
    var mouseover = function (event, d) {

        const cx = +d3.select(this).attr("cx");
        const cy = +d3.select(this).attr("cy");
        const svgRect = this.ownerSVGElement.getBoundingClientRect();

        const left = svgRect.left + window.scrollX + cx;
        const top = svgRect.top + window.scrollY + cy - 1; // small gap

        ETTooltip
            .style("opacity", 1)
            .style("left", left + "px")
            .style("top", top + "px")
            .html(`
            <b>Year:</b> ${d.year}<br>
            <b>Mean:</b> ${d.mean.toFixed(1)} mm<br>
            <b>P25:</b> ${d.p25.toFixed(1)} mm<br>
            <b>P75:</b> ${d.p75.toFixed(1)} mm
        `);

        d3.select(this).style("stroke", "black");
    };
    // mousemove function draws black outline around dots
    // var mousemove = function (event, d) {
    //     ETTooltip
    //         .style("left", (event.pageX + 10) + "px")
    //         .style("top", (event.pageY - 20) + "px");
    //     d3.select(this)
    //         .style("opacity", 1)
    //         .style("stroke", "black")
    // }
    // tooltip disappears (opacity: 0) and black out
    var mouseleave = function (event, d) {
        ETTooltip
            .style("opacity", 0)
        d3.select(this)
            .style("stroke", "none")
    }

    // clear old chart
    d3.select("#et-chart").html("");

    // select chart and get width of client browser
    var container = d3.select("#et-chart").node();
    var containerWidth = container.clientWidth;
    var containerHeight = container.clientHeight;

    // dimensions
    var margin = { top: 10, right: 40, bottom: 30, left: 40 }

    // calculate width and height based on margins and client browser
    var minChartWidth = 500; // tweak this
    var width = Math.max(containerWidth, minChartWidth) - margin.left - margin.right;
    var height = containerHeight - margin.top - margin.bottom;

    // svg
    var svg = d3.select("#et-chart")
        .append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .attr("width", Math.max(containerWidth, minChartWidth));

    // scales
    var x = d3.scalePoint()
        .domain(data.map(d => d.year))
        .range([0, width])
        .padding(0.5);

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
        .call(d3.axisLeft(y).ticks(width / 75));

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
        //.on("mousemove", mousemove)
        .on("mouseleave", mouseleave)
};

let resizeTimeout;
let lastWidth = null;

window.addEventListener("resize", () => {

    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(() => {
        const container = d3.select("#et-chart").node();
        if (!container) return;

        const newWidth = container.clientWidth;

        if (currentETData && newWidth !== lastWidth) {
            lastWidth = newWidth;
            drawETChart(currentETData);
        }
    }, 150);

});