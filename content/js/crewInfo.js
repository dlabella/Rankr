var crewInfoModal = {};

var rowDefs = window.scorebot.rowDefs;
var historyRowDefs = window.scorebot.rowDefs;

$(document).ready(function () {
    var crewInfo = document.getElementById("crew-info");
    crewInfoModal = M.Modal.getInstance(crewInfo);
    // $('#scoreTable').on('click', 'tr', function () {
    //     var data = window.scorebot.table.row(this).data();
    //     showCrewInfo(data);
    // });
});

function showCrewInfo(data) {
    var crew = data[rowDefs["tag"]];
    for (var key in rowDefs) {
        var index = rowDefs[key];
        var val = data[index];
        $("#crew-info-" + key).text(val);
    }
    crewInfoModal.open();
    loadHistoryData(crew);
}

function loadHistoryData(crew, forced) {
    var f = 'false';
    if (forced === true) {
        f = 'true';
    }
    $("#crew-info-loading").show();
    return fetch('/history?crew=' + encodeURIComponent(crew) + '&forced=' + f)
        .then(response => {
            processHistoryResponse(crew, response).then(() => {
                $("#crew-info-loading").hide();
            });
        })
        .catch(ex => {
            console.log("ERROR: " + ex)
        });
}

function processHistoryResponse(crew, response) {
    return response.json().then(data => {
        //Polar Chart
        var chartData = getPolarChartData(crew, data);
        var ctx = document.getElementById('crewInfoElo').getContext('2d');
        var chart = new Chart(ctx, {
            data: chartData,
            type: 'polarArea'
        });

    })
}

function getPolarChartData(crew, historyData) {
    map = {};
    if (!historyData || ! historyData.data){
        return [];
    }
    for(var row of historyData.data){
        var winnerCrew = row[historyRowDefs["winner"]];
        var loserCrew = row[historyRowDefs["winner"]];
        var opponent = (winnerCrew === crew ? loserCrew : winnerCrew);
        var mode = 1;
        if (crew === loserCrew) {
            mode = -1;
        }
        if (map[opponent]) {
            var elo = row[historyRowDefs["winnerElo"]];
            map[opponent] += (elo * mode);
        }
    };
    var eloData=[];
    var opponents=[];
    for(var key in map){
        eloData.push(map[key]);
        opponents.push(key);
    }

    data = {
        datasets: [{
            data: eloData
        }],
        labels: opponents
    };
    return data;
}

