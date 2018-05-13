queue()
    .defer(d3.csv, "static/data/salaries.csv")
    .await(makeGraphs);
    
function makeGraphs(error, salaryData) {
    var ndx = crossfilter(salaryData);
    
    salaryData.forEach(function(d) {
        d.salary = parseInt(d.salary);
        d.yrs_service = parseInt(d['yrs.service']);
    });
    
    showDisciplineSelector(ndx);
    
    showPercentProfByGender(ndx, 'Female', '#percent-of-women-professors');
    showPercentProfByGender(ndx, 'Male', '#percent-of-men-professors');
    
    showGenderBalance(ndx);
    showAverageSalaries(ndx);
    showRankDist(ndx);
    
    showServiceToSalaryCorr(ndx);
    
    
    dc.renderAll();
}

function showDisciplineSelector(ndx) {
    dim = ndx.dimension(dc.pluck('discipline'));
    group = dim.group();
    
    dc.selectMenu('#discipline-selector')
        .dimension(dim)
        .group(group)
}

function showPercentProfByGender(ndx, gender, element) {
    var percentage = ndx.groupAll().reduce(
        function(p, v) {
            if(v.sex == gender) {
                p.count++;
                if(v.rank == 'Prof') {
                    p.areProf++;
                }
            }
            return p;
        },
        function(p, v) {
            if(v.sex == gender) {
                p.count--;
                if(v.rank == 'Prof') {
                    p.areProf--;
                }
            }
            return p;
        },
        function () {
            return {count: 0, areProf: 0};
        }
    );
    
    dc.numberDisplay(element)
        .formatNumber(d3.format('.2%'))
        .valueAccessor(function(d) {
            if(d.count == 0) {
                return 0;
            } else {
                return (d.areProf / d.count);
            }
        })
        .group(percentage);
        
}

function showGenderBalance(ndx) {
    var dim = ndx.dimension(dc.pluck('sex'));
    var group = dim.group();
    
    dc.barChart('#gender-balance')
        .width(400)
        .height(300)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .dimension(dim)
        .group(group)
        .transitionDuration(500)
        .x(d3.scaleOrdinal())
        .xUnits(dc.units.ordinal)
        .xAxisLabel("Gender")
        .yAxis().ticks(20);
}

function showAverageSalaries(ndx) {
    var dim = ndx.dimension(dc.pluck('sex'));
    
    function add(p, v) {
        p.count++;
        p.total += v.salary;
        p.average = p.total / p.count;
        return p;
    }
    
    function remove(p, v) {
        p.count--;
        if(p.count == 0) {
            p.total = 0;
            p.average = 0;
        } else {
            p.total -= v.salary;
            p.average = p.total / p.count;
        }
        return p;
    }
    
    function init() {
        return {count: 0, total: 0, average: 0};
    }
    
    var averageSalaryByGender = dim.group().reduce(add, remove, init);
    
    dc.barChart('#average-salary')
        .width(400)
        .height(300)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .dimension(dim)
        .group(averageSalaryByGender)
        .valueAccessor(function(d) {
            return parseInt(d.value.average); // Rounded to integer for simplicity
        })
        .transitionDuration(500)
        .x(d3.scaleOrdinal())
        .xUnits(dc.units.ordinal)
        .elasticY(true)
        .xAxisLabel("Gender")
        .yAxis().ticks(4);
}

function showRankDist(ndx) {
    
    function rankByGender(dimension, rank) {
        return dimension.group().reduce(
            function(p, v) {
                p.total++;
                if(v.rank == rank) {
                    p.match++;
                }
                return p;
            },
            function(p, v) {
                p.total--;
                if(v.rank == rank) {
                    p.match--;
                }
                return p;
            },
            function() {
                return {total: 0, match: 0};
            }
        );
    }
    
    var dim = ndx.dimension(dc.pluck('sex'));
    var profByGender = rankByGender(dim, 'Prof');
    var asstProfByGender = rankByGender(dim, 'AsstProf');
    var assocProfByGender = rankByGender(dim, 'AssocProf');
    
    dc.barChart('#rank-distribution')
        .width(400)
        .height(300)
        .dimension(dim)
        .group(profByGender, 'Prof.')
        .stack(asstProfByGender, 'Asst. Prof.')
        .stack(assocProfByGender, 'Assoc. Prof.')
        .valueAccessor(function(d) {
            if(d.value.total > 0) {
                return (d.value.match / d.value.total) * 100;
            } else {
                return 0;
            }
        })
        .x(d3.scaleOrdinal())
        .xUnits(dc.units.ordinal)
        .legend(dc.legend().x(320).y(20).itemHeight(15).gap(5))
        .margins({top: 10, right: 100, bottom: 30, left: 50});
}

function showServiceToSalaryCorr(ndx) {
    
    var genderColors = d3.scaleOrdinal()
        .domain(['Female', 'Male'])
        .range(['pink', 'blue']);
    
    var eDim = ndx.dimension(dc.pluck('yrs_service'));
    var experienceDim = ndx.dimension(function(d) {
        return [d.yrs_service, d.salary, d.rank, d.sex];
    });
    
    var experienceSalaryGroup = experienceDim.group();
    
    var minExperience = eDim.bottom(1)[0].yrs_service;
    var maxExperience = eDim.top(1)[0].yrs_service;
    
    dc.scatterPlot('#service-salary')
        .width(800)
        .height(400)
        .x(d3.scaleLinear().domain([minExperience, maxExperience]))
        .brushOn(false)
        .symbolSize(8)
        .clipPadding(10)
        .yAxisLabel('Salary')
        .xAxisLabel('Years of Service')
        .title(function(d) {
            return d.key[3] + ' ' + d.key[2] + ' earned $' + d.key[1];
        })
        .colorAccessor(function(d) {
            return d.key[3];
        })
        .colors(genderColors)
        .dimension(experienceDim)
        .group(experienceSalaryGroup)
        .margins({top: 10, right: 50, bottom: 75, left: 75});
}