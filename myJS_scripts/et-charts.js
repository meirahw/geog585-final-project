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
        .style("position", "fixed")
        .style("opacity", 0)
        .style("display", "none");


    var mouseover = function (event, d) {
        ETTooltip
            .style("display", "block")
            .style("opacity", 1)
            .html(`
        <b>Year:</b> ${d.year}<br>
        <b>Mean:</b> ${format(d.mean)} mm<br>
        <b>P25:</b> ${format(d.p25)} mm<br>
        <b>P75:</b> ${format(d.p75)} mm
    `);

        d3.select(this).style("stroke", "black");
    };

    // had a mouseover event that worked well everywhere but the edges (would get cut off at the bottom/right)
    // used ChatGPT to help implement "preferred" location for tooltip
    var mousemove = function (event) {

        var tooltip = ETTooltip.node();

        var tooltipWidth = tooltip.offsetWidth || 160;
        var tooltipHeight = tooltip.offsetHeight || 80;

        var offset = 15;

        var x = event.clientX;
        var y = event.clientY;

        // available space (right, left, bottom, top)
        var spaceRight = window.innerWidth - x;
        var spaceLeft = x;
        var spaceBottom = window.innerHeight - y;
        var spaceTop = y;

        // default preferred quadrant: bottom-right
        var left, top;

        // decide horizontal direction
        var placeRight = spaceRight > tooltipWidth + offset;
        var placeBottom = spaceBottom > tooltipHeight + offset || spaceBottom > spaceTop;

        // quadrant logic (4-way decision)
        if (placeRight && placeBottom) {
            // bottom-right
            left = x + offset;
            top = y + offset;
        }
        else if (!placeRight && placeBottom) {
            // bottom-left
            left = x - tooltipWidth - offset;
            top = y + offset;
        }
        else if (placeRight && !placeBottom) {
            // top-right
            left = x + offset;
            top = y - tooltipHeight - offset;
        }
        else {
            // top-left
            left = x - tooltipWidth - offset;
            top = y - tooltipHeight - offset;
        }

        // add constraint so that the tooltip doesn't get too close to the edges
        left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));
        top = Math.max(10, Math.min(top, window.innerHeight - tooltipHeight - 10));

        ETTooltip
            .style("left", left + "px")
            .style("top", top + "px");
    };

    // tooltip disappears when mouse leaves the circle
    var mouseleave = function (event, d) {
        ETTooltip
            .style("opacity", 0)
        d3.select(this)
            .style("stroke", "none")
    }

    // select chart and get width of client browser
    //var container = document.querySelector("#et-chart");
    var container = document.querySelector("#et-chart-wrapper");

    var containerWidth = container.getBoundingClientRect().width;
    var containerHeight = container.getBoundingClientRect().height;

    var margin = { top: 10, right: 40, bottom: 40, left: 50};

    var minChartWidth = 300;
    var width = Math.max(minChartWidth, containerWidth - margin.left - margin.right - 10);
    var width = Math.max(minChartWidth, containerWidth - margin.left - margin.right);
    var height = containerHeight - margin.top - margin.bottom - 20;

    // svg
    var svg = d3.select("#et-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
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
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "10px");

    svg.append("g")
        .call(d3.axisLeft(y).ticks(5))
        .selectAll("text")
        .style("font-size", "10px");

    svg.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + 25)
        .attr("dy", "0.8em")
        .text("Years")
        .style("font-size", "10px");

    svg.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -(height / 2))
        .attr("y", -(margin.left) + 8)
        .text("ET (mm)")
        .style("font-size", "10px");

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
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave)

}

// original event listener (https://www.w3schools.com/JsrEF/event_onresize.asp) wasn't working exactly how I wanted,
// used ChatGPT which suggested the requestAnimationFrame (https://www.w3schools.com/Jsref/met_win_requestanimationframe.asp)
window.addEventListener("resize", () => {
    requestAnimationFrame(() => {
        if (currentETData) updateETChart(currentETData);
    });
});
