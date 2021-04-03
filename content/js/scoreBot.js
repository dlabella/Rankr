const tableId = "scoreTable";
var matchModal = {};
window.scorebot = {
    table: null,
    tableData: null,
    columnDefs: {
        rowid: 0,
        position: 1,
        tag: 2,
        name: 3,
        wins: 4,
        losses: 5,
        elo: 6,
        rank: 7
    },
    historyColumnDefs: {
        date: 0,
        winner: 1,
        winnerElo: 2,
        winnerRank: 3,
        winnerIncrease: 4,
        winnerUpset: 5,
        loser: 6,
        loserElo: 7,
        loserRank: 8,
        loserStockDiff: 9,
    }
}
var columnDefs = window.scorebot.columnDefs;
$(document).ready(function () {
    M.AutoInit();
    var matchModalEl = document.getElementById("match-result");
    matchModal =  M.Modal.init(matchModalEl, {
        onOpenStart : function(){
            document.forms['match-result-form'].reset();
        }
    });
    var crewModalEl = document.getElementById("add-crew");
    crewModal = M.Modal.getInstance(crewModalEl);

    var dateEl = document.getElementById("matchDate");
    var dateInstance = M.Datepicker.init(dateEl, { format: 'yyyy-mm-dd', defaultDate: new Date() });

    $(".js-reload").click(function () {
        loadScoreData(true);
    })

    manageFormSubmit("match-result-form", "match-result-submit", "/match",
        () => { $("#tableLoading").show(); matchModal.close(); },
        () => { loadScoreData(true); });

    manageFormSubmit("add-crew-form", "add-crew-submit", "/crew",
        () => { crewModal.close(); },
        () => { loadScoreData(true); });

    $("input").change(function () {
        var newELO = computeData();
        if (newELO) {
            $("#winnerTeamIncrease").val(newELO);
        }
    });

    matchModal.options.onOpenEnd = function () {
        dateInstance.setDate(new Date());
    };

    loadScoreData();
});



function manageFormSubmit(formId, submitId, url, completeCb, successCb) {
    $("#" + submitId).click(function (e) {
        e.preventDefault();
        var form = $("#" + formId);
        var formData = form.serialize();
        $.ajax({
            type: "POST",
            url: url,
            data: formData,
            success: function (data) {
                form.reset();
                if (successCb) {
                    successCb();
                }
            },
            fail: function (xhr, textStatus, errorThrown) {
                alert('There was a problem updating the data, check datasource');
                console.log(errorThrown);
            }
        });
        if (completeCb) {
            completeCb();
        }
    });
}

function loadScoreData(forced) {
    $("#tableLoading").show();
    var f = 'false';
    if (forced === true) {
        f = 'true';
    }
    return fetch('/data?forced=' + f)
        .then(response => {
            processResponse(response).then(() => {
                $("#tableLoading").hide();
                $('#' + tableId).show();

                initCrewAutocomplete();
            });
        })
        .catch(ex => {
            console.log("ERROR: " + ex)
        });
}

function initCrewAutocomplete() {
    var crewList = {};
    var crewColumn = columnDefs["tag"];
    for (var row of window.scorebot.tableData) {
        var tag = row[crewColumn];
        crewList[tag] = null;
    }
    var winnerAutocomplete = document.getElementById('winnerTeam');
    var loserAutocomplete = document.getElementById('loserTeam');
    M.Autocomplete.init(winnerAutocomplete, { data: crewList, onAutocomplete: winnerAutocompleted });
    M.Autocomplete.init(loserAutocomplete, { data: crewList, onAutocomplete: loserAutocompleted });
}

function winnerAutocompleted(value) {
    var elo = getCrewELO(value);
    $("#winnerTeamELO").val(elo);
}

function loserAutocompleted(value) {
    var elo = getCrewELO(value);
    $("#loserTeamELO").val(elo);
}

function getCrewELO(crew) {
    for (var row of window.scorebot.tableData) {
        if (row[columnDefs["tag"]] === crew) {
            return row[columnDefs["elo"]];
        }
    }
    return 0;
}


function getRankFromELO(ELO) {
    if (ELO <= 1349) {
        return 1;
    }
    if (ELO <= 1499) {
        return 2;
    }
    if (ELO <= 1749) {
        return 3;
    }
    if (ELO <= 1999) {
        return 4;
    }
    if (ELO >= 2000) {
        return 5;
    }
}

function computeData() {
    var winner = $('#winnerTeam').val();
    var loser = $('#loserTeam').val();
    var P = null;
    var Q = null;

    if (winner) {
        Q = getCrewELO(winner);
        var winnerRank = getRankFromELO(Q);
        $('#winnerTeamRank').val(winnerRank);
    }

    if (loser) {
        P = getCrewELO(loser);
        var loserRank = getRankFromELO(P);
        $('#loserTeamRank').val(loserRank);
    }

    var dStr = $("#stockDiff").val();
    if (!dStr) {
        return null;
    }
    var d = parseInt(dStr);
    var R = getRankDifference(Q, P);
    var mode = "-";
    if (Q >= P) {
        var result = (P / Q * ((50 + d) * (1 - R / 5)));
    } else {
        mode = "Y"
        var result = (P / Q * ((50 + d) * (1 + R / 5)));
    }
    $("#winnerTeamUpset").val(mode);
    return Math.round(result);
}

function processResponse(response, table) {
    return response.json().then(data => {
        window.scorebot.tableData = data.data;
        if (window.scorebot.table) {
            window.scorebot.table.clear().rows.add(data.data).draw()
        } else {
            window.scorebot.table = $('#' + tableId).DataTable({
                columnDefs: [
                    {
                        "targets": [0],
                        "visible": false,
                        "searchable": false
                    }],
                data: data.data,
                responsive: true
            });
        }

    });
}

function getRankDifference(crewAELO, crewBELO) {
    var arank = getRankFromELO(crewAELO);
    var brank = getRankFromELO(crewBELO);
    var result = arank - brank;
    if (result < 0) {
        result = result * -1;
    }
    return result;
}