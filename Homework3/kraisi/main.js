const width = window.innerWidth;
const height = window.innerHeight;

let lineLeft = 0, lineTop = 0;
let lineMargin = {top: 10, right: 30, bottom: 30, left: 60},
    lineWidth = 400 - lineMargin.left - lineMargin.right,
    lineHeight = 350 - lineMargin.top - lineMargin.bottom;

let barLeft = 0, barTop = 0;
let barMargin = {top: 10, right: 30, bottom: 30, left: 60},
    barWidth = 400 - barMargin.left - barMargin.right,
    barHeight = 350 - barMargin.top - barMargin.bottom;
    
let parallelLeft = 0, parallelTop = 400;
let parallelMargin = {top: 10, right: 30, bottom: 30, left: 60},
    parallelWidth = width - parallelMargin.left - parallelMargin.right,
    parallelHeight = height - 450 - parallelMargin.top - parallelMargin.bottom;

// plots
d3.csv("data/ds_salaries.csv").then(data =>{
    console.log("data", data);

    // clean the data into numbers and strings
    const cleanData = data.map(d => ({
        job_title: d["job_title"],
        experience_level: d["experience_level"],
        employment_type: d["employment_type"],
        employee_residence: d["employee_residence"],
        remote_ratio: +d["remote_ratio"],
        company_location: d["company_location"],
        company_size: d["company_size"],
        salary_in_usd: +d["salary_in_usd"],
        work_year: +d["work_year"]
    }));

    // I only want the rows where employee lives in US and are full-time
    const cleanUSFTData = cleanData.filter(d => d.employee_residence === "US" && d.employment_type === "FT");
    console.log("US FT Data", cleanUSFTData);

    // First visualization is a bar chart comparing remote versus non-remote salaries
    const nonremoteGroup = cleanUSFTData.filter(d => d.remote_ratio >= 0 && d.remote_ratio <= 10);
    const remoteGroup = cleanUSFTData.filter(d => d.remote_ratio >= 90 && d.remote_ratio <= 100);

    // I use d3.mean to find the average salary of the given group
    const average = array => d3.mean(array, d => d.salary_in_usd);

    // Labels for the our bars/groups
    // The remote ratios (0 - 100) detail how much they work on-site or not
    // I grouped them 0-10 and 90-100 for clarity and it has most of the data included
    const barData = [
        { label: "Non-Remote", average_salary: average(nonremoteGroup) },
        { label: "Remote", average_salary: average(remoteGroup) }
    ];

    // Used ChatGPT to learn the syntax for legends, axes, and labels
    // Modified to apply it to my data
    const svg = d3.select("svg")

    const barChart = svg.append("g")
    .attr("transform", `translate(${barMargin.left + 10},${barMargin.top + 15})`);

    // x scale
    const x = d3.scaleBand()
    .domain(barData.map(d => d.label))
    .range([0, barWidth])
    .padding(0.3);

    // y scale
    // I use d3 .nice() to round the domain values
    const y = d3.scaleLinear()
    .domain([0, d3.max(barData, d => d.average_salary)])
    .nice()
    .range([barHeight, 0]);

    // x axis
    barChart.append("g")
    .attr("transform", `translate(0,${barHeight})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "12px");

    // y axis
    barChart.append("g")
    .call(d3.axisLeft(y).ticks(6));

    // bars
    barChart.selectAll("rect")
    .data(barData)
    .enter()
    .append("rect")
    .attr("x", d => x(d.label))
    .attr("y", d => y(d.average_salary))
    .attr("width", x.bandwidth())
    .attr("height", d => barHeight - y(d.average_salary))
    .attr("fill", d => {
        if (d.label === "Remote") return "#b47846";
        if (d.label === "Non-Remote") return "steelblue";
    });

    // bar labels
    barChart.selectAll("text.bar-label")
    .data(barData)
    .enter()
    .append("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d.label) + x.bandwidth() / 2)
    .attr("y", d => y(d.average_salary) + 15)
    .attr("text-anchor", "middle")
    .text(d => `$${Math.round(d.average_salary).toLocaleString()}`)
    .style("font-size", "15px")
    .style("fill", "white");

    // title and axes labels
    barChart.append("text")
    .attr("x", barWidth / 2)
    .attr("y", -7)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Average Salary: Non-Remote vs Remote Data Science Employees");

    barChart.append("text")
    .attr("x", barWidth / 2)
    .attr("y", barHeight + 35)
    .attr("text-anchor", "middle")

    barChart.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", `translate(-50,${barHeight / 2}) rotate(-90)`)
    .text("Average Salary (USD)");

    // legend formatting
    const barLegend = svg.append("g")
    .attr("transform", `translate(${barMargin.left + barWidth + 50}, ${barMargin.top + 150})`);

    const barLegendItems = [
        { label: "Non-Remote: 0 - 10% remote", color: "steelblue" },
        { label: "Remote: 90 - 100% remote", color: "#b47846" }
    ];

    barLegend.selectAll("rect")
    .data(barLegendItems)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 25)
    .attr("width", 18)
    .attr("height", 18)
    .attr("fill", d => d.color);

    barLegend.selectAll("text")
    .data(barLegendItems)
    .enter()
    .append("text")
    .attr("x", 25)
    .attr("y", (d, i) => i * 25 + 14)
    .text(d => d.label)
    .style("font-size", "14px");

    // Second visualization is a line chart showing the change in average salary per year from 2020 - 2023
    // I aggregate the data so that we can get the average salary per year using d3.mean and d3.rollup
/*
    const salaryYear = d3.rollups(
        cleanUSFTData,
        v => d3.mean(v, d => d.salary_in_usd),
        d => d.work_year
    ).map(([year, average]) => ({ year: +year, average_salary: average }));

    // sort the data to get chronological order
    salaryYear.sort((a, b) => a.year - b.year);
*/

    function expLevelSalaryYear(data, experienceLevel = "ALL") {
        const filteredLevelData = experienceLevel === "ALL"
            ? data
            : data.filter(d => d.experience_level === experienceLevel);
        
        // I aggregate the data so that we can get the average salary per year using d3.mean and d3.rollup
        const salaryYear = d3.rollups(
            filteredLevelData,
            v => d3.mean(v, d => d.salary_in_usd),
            d => d.work_year
        ).map(([year, average]) => ({ year: +year, average_salary: average }));

        // sort the data to get chronological order
        salaryYear.sort((a, b) => a.year - b.year);
        return salaryYear;
    }

/*
    // log the average per year to use in legend
    salaryYear.forEach(d => {
        console.log(`${d.year}: $${Math.round(d.average_salary).toLocaleString()}`);
    });
*/

    // Used ChatGPT to learn the syntax for legends, axes, and labels
    // Also syntax necessary for line charts
    // Modified to apply it to my data
    const lineChart = svg.append("g")
    .attr("transform", `translate(${barWidth + lineMargin.left + 380},${lineMargin.top + 15})`);

    lineChart.append("text")
    .attr("id", "fixedLabel")
    .attr("x", lineWidth + 210)
    .attr("y", 100)
    .attr("text-anchor", "end")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Average Salary: ");

    // x scale
    const x1 = d3.scaleLinear()
    //.domain(d3.extent(salaryYear, d => d.year))
    .range([0, lineWidth]);

    // y scale
    const y1 = d3.scaleLinear()
    //.domain([120000, d3.max(salaryYear, d => d.average_salary)])
    //.nice()
    .range([lineHeight, 0]);

    // Used ChatGPT to learn syntax/implementation needed for brushing and brush handling for line chart
    // Modified it to apply it to my code and reused HW2 code
    // d3.brushX creates a new one-dim brush along X
    // https://d3js.org/d3-brush
    const brushWidth = 60;
    const brush = d3.brushX()
    .extent([[0, 0], [lineWidth, lineHeight]])
    .on("brush", brushed)
    .on("end", keepFixedBrush);

    lineChart.append("g")
    .attr("class", "brush")
    .call(brush)
    .call(brush.move, [lineWidth / 2 - brushWidth / 2, lineWidth / 2 + brushWidth / 2]);

    // I wanted it to make it so as you brush over line chart, the center X value of the current box view of the line returns the exact salary value at that point
    // Used ChatGPT to finetune text, labels, syntax
    function brushed(event) {
        if (!event.selection) return;

        const line = lineChart.select(".line-path");
        if (line.empty()) return;

        const [x0, x1Brush] = event.selection;
        const centerX = (x0 + x1Brush) / 2;

        const centerYear = Math.round(x1.invert(centerX));

        const currentLinePoint = line.datum();
        const match = currentLinePoint.find(d => d.year === centerYear);

        lineChart.select("#brushInformation").remove();

        if (match) {
            lineChart.append("text")
            .attr("id", "brushInformation")
            .attr("x", x1(match.year))
            .attr("y", y1(match.average_salary) - 10)
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .style("font-size", "12px")
            .text(`$${Math.round(match.average_salary).toLocaleString()}`);

            lineChart.select("#fixedLabel")
            .text(`Average Salary: $${Math.round(match.average_salary).toLocaleString()}`);
        }
    }

    function keepFixedBrush(event) {
        if (!event.selection) return;

        const [x0, x1] = event.selection;
        const center = (x0 + x1) / 2;
        const newX0 = center - brushWidth / 2;
        const newX1 = center + brushWidth / 2;

        d3.select(this).transition().call(brush.move, [newX0, newX1]);
    }
/*
    // x scale
    const x1 = d3.scaleLinear()
    //.domain(d3.extent(salaryYear, d => d.year))
    .range([0, lineWidth]);

    // y scale
    const y1 = d3.scaleLinear()
    //.domain([120000, d3.max(salaryYear, d => d.average_salary)])
    //.nice()
    .range([lineHeight, 0]);
*/
    // axes
    //lineChart.append("g")
    //.attr("transform", `translate(0,${lineHeight})`)
    //.call(d3.axisBottom(x1).ticks(4).tickFormat(d3.format("d")));

    //lineChart.append("g")
    //.call(d3.axisLeft(y1).ticks(4));

    const line = d3.line()
    .x(d => x1(d.year))
    .y(d => y1(d.average_salary));

    // Used ChatGPT to learn how to create an update function for my filtering transition with animation
    // Modified/Moved my already existing (now commented) HW2 code into a function basically in order to dynamically update/animate for HW3
    function updateLineChart(experienceLevel) {
        const data = expLevelSalaryYear(cleanUSFTData, experienceLevel);

        // d3.extent bounds minimum and maximum values for y-axis as you change levels
        x1.domain(d3.extent(data, d => d.year));
        y1.domain(d3.extent(data, d => d.average_salary))
        .nice();

        let path = lineChart.selectAll("path.line-path");

        if (path.empty()) {
            path = lineChart.append("path")
                    .attr("class", "line-path")
                    .attr("fill", "none")
                    .attr("stroke", "steelblue")
                    .attr("stroke-width", 2);
        }

        path.datum(data)
        .transition()
        .duration(750)
        .attr("d", line);

        lineChart.selectAll(".x-axis").remove();
        lineChart.selectAll(".y-axis").remove();

        lineChart.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${lineHeight})`)
        .call(d3.axisBottom(x1).ticks(4).tickFormat(d3.format("d")));

        lineChart.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y1));
    }

/*
    // drawing the line + text needed for axes
    lineChart.append("path")
    .datum(salaryYear)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", line);
*/

    lineChart.append("text")
    .attr("x", lineWidth / 2)
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Average Salary of US Data Science Employees by Year");

    lineChart.append("text")
    .attr("x", lineWidth / 2)
    .attr("y", lineHeight + 30)
    .attr("text-anchor", "middle")
    .text("Year");

    lineChart.append("text")
    .attr("transform", `translate(-50,${lineHeight / 2}) rotate(-90)`)
    .attr("text-anchor", "middle")
    .text("Average Salary (USD)");

    // legend formatting
    const lineLegend = svg.append("g")
    .attr("transform", `translate(${barWidth + lineMargin.left + 400 + lineWidth + 20}, ${lineMargin.top + 140})`);

    lineLegend.append("rect")
    .attr("width", 18)
    .attr("height", 3)
    .attr("fill", "steelblue");

    lineLegend.append("text")
    .attr("x", 25)
    .attr("y", 10)
    .text("Average Salary Over Years")
    .style("font-size", "12px")
    .attr("alignment-baseline", "end");

    const averagePerYear = [
        "2020 All Levels Average: $157,262",
        "2021 All Levels Average: $143,623",
        "2022 All Levels Average: $148,262",
        "2023 All Levels Average: $157,209"
    ];

    averagePerYear.forEach((label, i) => {
        lineLegend.append("text")
        .attr("x", 0)
        .attr("y", 30 + i * 18)
        .text(label)
        .style("font-size", "14px")
    })

    // Third visualization is a parallel coordinates plot
    // of experience level, average remote ratio, and average salary
    // Aggregated the data below
    const averagePerLevel = d3.rollups(
        cleanUSFTData,
        v => ({
            average_remote_ratio: d3.mean(v, d => d.remote_ratio),
            average_salary: d3.mean(v, d => d.salary_in_usd)
        }),
        d => d.experience_level
    );

    // logging for debugging purposes
    averagePerLevel.forEach(([level, stats]) => {
        console.log(`Experience Level: ${level}`);
        console.log(`$${Math.round(stats.average_salary).toLocaleString()}`);
        console.log(`${stats.average_remote_ratio.toFixed(2)}%`);
    })

    const averagePerLevelMap = new Map(averagePerLevel.map(([exp, vals]) => [exp, vals]));

    const parallelData = cleanUSFTData.map(d => ({
        ...d,
        average_remote_ratio: averagePerLevelMap.get(d.experience_level).average_remote_ratio,
        average_salary: averagePerLevelMap.get(d.experience_level).average_salary
    }));

    const parallelChart = svg.append("g")
    .attr("transform", `translate(${parallelMargin.left - 10}, ${barHeight + barMargin.top + 80})`);

    // Used ChatGPT to learn the syntax for legends, axes, and labels
    // Also syntax necessary for parallel coordinates plot
    // Modified to apply it correctly to my data and customize look (colors, graph style, etc)
    const dimensions = [
        "experience_level",
        "average_remote_ratio",
        "average_salary"
    ];

    const x2 = d3.scalePoint()
    .domain(dimensions)
    .range([0, parallelWidth]);

    // set the domain/range of each axis on the parallel coordinates plot
    const y2 = {};
    ["experience_level"].forEach(dim => {
        y2[dim] = d3.scalePoint()
        .domain([...new Set(parallelData.map(d => d[dim]))])
        .range([parallelHeight, 0]);
    });

    ["average_remote_ratio", "average_salary"].forEach(dim => {
        y2["average_remote_ratio"] = d3.scaleLinear()
        .domain([34, 50])
        .range([parallelHeight, 0]);

        y2["average_salary"] = d3.scaleLinear()
        .domain([100000, 210000])
        .range([parallelHeight, 0]);
    });

    // color code the different experience levels
    const experienceLevels = [...new Set(parallelData.map(d => d.experience_level))];
    const color = d3.scaleOrdinal()
    .domain(experienceLevels)
    .range(d3.schemeCategory10);
/*
    parallelChart.selectAll("backgroundLine")
    .data(cleanUSFTData)
    .enter()
    .append("path")
    .attr("fill", "none")
    .attr("stroke", "#ccc")
    .attr("stroke-width", 1)
    .attr("d", d => {
        return d3.line()(dimensions.map(p => [x2(p), y2[p](d[p])]));
    });
*/
    // Used ChatGPT to learn how to use on("click") functionality on my parallel plot in order to implement selection for it
    // Modified/applied my HW2 code in order to do this, similar as above
    // set line attributes and call line function
    parallelChart.selectAll("foregroundLine")
    .data(parallelData)
    .enter()
    .append("path")
    .attr("class", "parallel-line")
    .attr("fill", "none")
    .attr("stroke", d => color(d.experience_level))
    .attr("stroke-width", 1.5)
    .attr("d", d => d3.line()(
        dimensions.map(dim => {
            const val = d[dim];
            return [x2(dim), y2[dim](val)];
        })
    ))
    .on("click", function(event, d) {
        parallelChart.selectAll(".parallel-line").style("stroke-opacity", 1).style("stroke-width", 1.5);
        d3.select(this).style("stroke-opacity", 1).style("stroke-width", 6);

        d3.select("#selectedInformation").remove();
        svg.append("text")
        .attr("id", "selectedInformation")
        .attr("x", 800)
        .attr("y", parallelTop + parallelHeight + 55)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text(`Selected: ${d.experience_level}, ${d.average_remote_ratio.toFixed(1)}% Remote, Average Salary: $${Math.round(d.average_salary).toLocaleString()}`);
    })

    const axisLabels = {
        experience_level: "Experience Level",
        average_remote_ratio: "Average Remote Work Ratio (%)",
        average_salary: "Average Salary (USD)"
    };

    // draw axes
    dimensions.forEach(dim => {
        const g = parallelChart.append("g")
        .attr("transform", `translate(${x2(dim)}, 0)`);

        g.call(d3.axisLeft(y2[dim]));

        // axes titles
        g.append("text")
        .attr("y", parallelHeight + 20)
        .attr("x", dim === "average_salary" ? -50 : 0)
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "black")
        .text(axisLabels[dim]);
    });

    // chart title
    parallelChart.append("text")
    .attr("x", parallelWidth / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Average Salary and Average Remote Work Percent by Experience Level");

    const experienceLevelNames = {
        "SE": "Senior Level",
        "EN": "Entry Level",
        "MI": "Mid Level",
        "EX": "Executive Level"
    };

    // legend formatting
    const parallelLegend = svg.append("g")
    .attr("transform", `translate(${parallelMargin.left}, ${barHeight + barMargin.top + 80 + parallelHeight + 40})`);

    const legendItems = experienceLevels.map(level => ({
        acronym: level,
        label: `${level}: ${experienceLevelNames[level]}`
    }));

    const legendSpacing = 130;

    parallelLegend.selectAll("rect")
    .data(legendItems)
    .enter()
    .append("rect")
    .attr("x", (d, i) => i * legendSpacing)
    .attr("width", 18)
    .attr("height", 18)
    .attr("fill", d => color(d.acronym));

    parallelLegend.selectAll("text")
    .data(legendItems)
    .enter()
    .append("text")
    .attr("x", (d, i) => i * legendSpacing + 25)
    .attr("y", 14)
    .text(d => d.label)
    .style("font-size", "14px")
    .attr("alignment-baseline", "middle");

    updateLineChart("ALL");

    d3.select("#experienceSelect").on("change", function() {
        const selected = this.value;
        updateLineChart(selected);
    });
});