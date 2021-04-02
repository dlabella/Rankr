const tableId = "rankrTable";
var tableData = {};
var matchModal = {};
var crews = [];
const crewTag = 1;
const crewELO = 5;
const crewRank = 0;
var authToken = "";

$(document).ready(function () {
    M.AutoInit();
    var matchModalEl = document.getElementById("match-result");
    matchModal = M.Modal.getInstance(matchModalEl);

    var crewModalEl = document.getElementById("add-crew");
    crewModal = M.Modal.getInstance(crewModalEl);

    var dateEl = document.getElementById("matchDate");
    var dateInstance = M.Datepicker.init(dateEl, { format: 'yyyy-mm-dd', defaultDate: new Date() });

    $(".js-reload").click(function(){
        loadRankData(true);
    })

    manageFormSubmit("match-result-form", "match-result-submit", "/match",
        ()=> { matchModal.close(); },
        () => { loadRankData(true); });

    manageFormSubmit("add-crew-form", "add-crew-submit", "/crew",
        ()=> { crewModal.close(); },
        () => { loadRankData(true); });

    $("input").change(function () {
        var newELO = computeData();
        if (newELO) {
            $("#winnerTeamIncrease").val(newELO);
        }
    });
    matchModal.options.onOpenEnd = function () {
        dateInstance.setDate(new Date());
    };

    loadRankData();
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

function loadRankData(forced) {
    $("#tableLoading").show();
    var f = 'false';
    if (forced===true){
        f='true';
    }
    return fetch('/rankrTable?forced='+f)
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
    for (var row of tableData) {
        var tag = row[crewTag];
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
    for (var row of tableData) {
        if (row[crewTag] === crew) {
            return row[crewELO];
        }
    }
    return 0;
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
    if (winnerRank >= loserRank) {
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
        tableData = data.data;
        $('#' + tableId).DataTable({
            data: tableData
        });
    })

}

$.fn.serializeObject = function () {
    var o = {};
    var a = this.serializeArray();
    $.each(a, function () {
        if (o[this.name]) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};