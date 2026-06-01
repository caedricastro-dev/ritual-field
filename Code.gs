function doPost(e) { return handleRequest(e); }
function doGet(e)  { return handleRequest(e); }

function handleRequest(e) {
  try {
    var params = e.parameter;
    var callback = params.callback || null;

    var result;
    if (params.action === 'monthly') {
      result = getMonthlyTotals(params.month);
    } else if (params.action === 'weekly') {
      result = getWeeklyData(params.week, params.role);
    } else {
      result = saveData(params);
    }

    // JSONP — envolve resposta no callback se solicitado
    if (callback) {
      var json = result.getContent();
      return ContentService
        .createTextOutput(callback + '(' + json + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return result;

  } catch(err) {
    return ok({status: 'error', msg: err.toString()});
  }
}

function saveData(params) {
  var role = params.role;
  if (!role) return ok({status: 'no role'});

  var tabName = role.charAt(0).toUpperCase() + role.slice(1);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tabName);

  // Campos excluídos do cabeçalho
  var excludeKeys = ['role', 'week', 'callback', 'Semana', 'Data envio'];
  var incomingKeys = Object.keys(params).filter(function(k) {
    return excludeKeys.indexOf(k) === -1;
  });

  if (!sheet) {
    // Cria aba com cabeçalho completo
    sheet = ss.insertSheet(tabName);
    sheet.appendRow(['Semana', 'Data envio'].concat(incomingKeys));
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold');
  } else {
    // Adiciona colunas novas dinamicamente
    var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var newKeys = incomingKeys.filter(function(k) {
      return existingHeaders.indexOf(k) === -1;
    });
    if (newKeys.length > 0) {
      var lastCol = sheet.getLastColumn();
      newKeys.forEach(function(k, i) {
        sheet.getRange(1, lastCol + i + 1).setValue(k).setFontWeight('bold');
      });
    }
  }

  // Relê cabeçalho (pode ter crescido)
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function(k) {
    if (k === 'Semana')     return params.week || params.Semana || '';
    if (k === 'Data envio') return new Date().toLocaleString('pt-BR');
    return params[k] || '';
  });
  sheet.appendRow(row);
  return ok({status: 'saved'});
}

function getWeeklyData(week, role) {
  try {
    var tabName = role.charAt(0).toUpperCase() + role.slice(1);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) return ok({status: 'no sheet', data: null});

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return ok({status: 'empty', data: null});

    var headers = data[0];
    var weekCol = headers.indexOf('Semana');
    if (weekCol === -1) weekCol = headers.indexOf('week');
    if (weekCol === -1) return ok({status: 'no week col', data: null});

    // Busca linha mais recente que bata com a semana
    var found = null;
    for (var i = data.length - 1; i >= 1; i--) {
      var rawWeek = data[i][weekCol];
      var weekStr = '';
      try {
        var d = new Date(rawWeek);
        if (!isNaN(d.getTime())) {
          weekStr = Utilities.formatDate(d, 'America/Sao_Paulo', 'yyyy-MM-dd');
        } else {
          weekStr = String(rawWeek).slice(0, 10);
        }
      } catch(ex) {
        weekStr = String(rawWeek).slice(0, 10);
      }
      if (weekStr === week) { found = data[i]; break; }
    }

    if (!found) return ok({status: 'not found', data: null});

    // Monta objeto com headers
    var obj = {};
    headers.forEach(function(h, idx) {
      obj[h] = found[idx] !== undefined ? String(found[idx]) : '';
    });

    // Reconstrói reuniões (empresa_1, empresa_2...)
    var meetings = [], mi = 1;
    while (obj['empresa_' + mi] !== undefined && obj['empresa_' + mi] !== '') {
      meetings.push({
        empresa: obj['empresa_' + mi],
        data:    obj['data_reuniao_' + mi],
        consumiu:obj['consumiu_' + mi]
      });
      mi++;
    }
    if (meetings.length) obj.meetings = meetings;

    // Reconstrói ações do CS (acao_tipo_1, acao_tipo_2...)
    var actions = [], ai = 1;
    while (obj['acao_tipo_' + ai] !== undefined && obj['acao_tipo_' + ai] !== '') {
      actions.push({
        tipo:    obj['acao_tipo_' + ai],
        empresa: obj['acao_empresa_' + ai],
        data:    obj['acao_data_' + ai],
        tarifa:  obj['acao_tarifa_' + ai]
      });
      ai++;
    }
    if (actions.length) obj.actions = actions;

    return ok({status: 'ok', data: obj});

  } catch(err) {
    return ok({status: 'error', data: null, msg: err.toString()});
  }
}

function getMonthlyTotals(month) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var numericKeys = [
      'reunioes_total', 'consumiram', 'noshows',
      'total_acoes', 'visitas_presenciais', 'tarifas_enviadas',
      'reunioes_virtuais', 'treinamentos',
      'ativos', 'churn',
      'vistorias', 'dem_rec', 'dem_con', 'vip_ativos'
    ];
    var totals = {};
    numericKeys.forEach(function(k) { totals[k] = 0; });

    ['Closer', 'Cs', 'Vip'].forEach(function(tabName) {
      var sheet = ss.getSheetByName(tabName);
      if (!sheet) return;
      var data = sheet.getDataRange().getValues();
      if (data.length < 2) return;

      var headers = data[0];
      var weekCol = headers.indexOf('Semana');
      if (weekCol === -1) weekCol = headers.indexOf('week');
      if (weekCol === -1) return;

      for (var i = 1; i < data.length; i++) {
        var rawWeek = data[i][weekCol];
        var weekMonth = '';
        try {
          var d = new Date(rawWeek);
          if (!isNaN(d.getTime())) {
            weekMonth = Utilities.formatDate(d, 'America/Sao_Paulo', 'yyyy-MM');
          } else {
            weekMonth = String(rawWeek || '').slice(0, 7);
          }
        } catch(ex) {
          weekMonth = String(rawWeek || '').slice(0, 7);
        }
        if (weekMonth !== month) continue;

        headers.forEach(function(h, idx) {
          if (totals.hasOwnProperty(h)) {
            totals[h] += parseFloat(data[i][idx]) || 0;
          }
        });
      }
    });

    return ok({status: 'ok', totals: totals});

  } catch(err) {
    return ok({status: 'error', totals: {}, msg: err.toString()});
  }
}

function ok(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
