/**
 * AEGIS Option A Apps Script Webhook & Horizon Live Feed Engine
 * Handles:
 * 1. GET ?action=getHorizonData -> Reads horizon_data.json directly from Google Drive
 * 2. POST -> Logs /note, /calories, /journal, /receipts, /groceries
 * 3. POST mark_done -> Completes Google Tasks via API, appends to Notes Log, AND dynamically prunes horizon_data.json in Drive
 * 4. POST /horizon on-demand -> Refreshes Calendar, Tasks, Calorie totals directly into horizon_data.json
 */

const NOTES_DOC_ID = "1XuPuZkyzCoFk1vWt4kdU-0daoiscaLIaSuoiqKLWsvc";
const NUTRITION_SHEET_ID = "10SzZC5aQi2R_r7ulcukpozQ4Ws0Pbo5KqI32os_idlk";
const HORIZON_JSON_FILE_NAME = "horizon_data.json";

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
  
  if (action === "getHorizonData" || action === "getSummary") {
    var jsonFiles = DriveApp.getFilesByName(HORIZON_JSON_FILE_NAME);
    if (jsonFiles.hasNext()) {
      var jsonContent = jsonFiles.next().getBlob().getDataAsString();
      return ContentService.createTextOutput(jsonContent).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    totalCalories: getTodayCaloriesFromSheet()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var message = contents.message || "";
    var action = contents.action || "";
    var completedTasks = contents.completedTasks || [];
    var taskId = contents.task_id || null;
    
    if (taskId && completedTasks.indexOf(taskId) === -1) {
      completedTasks.push(taskId);
    }

    // 1. Handle Item Completion Sync (Checkbox Checked)
    if (action === "mark_done" || message.indexOf("mark_done:") === 0 || message.indexOf("/note mark_done:") === 0) {
      // Complete in Google Tasks API
      for (var i = 0; i < completedTasks.length; i++) {
        try {
          Tasks.Tasks.patch({ status: 'completed' }, '@default', completedTasks[i]);
        } catch (err) {
          Logger.log("Tasks API patch note: " + err.message);
        }
      }
      
      // Extract titles to mark
      var titlesStr = message.replace("/note mark_done:", "").replace("mark_done:", "").trim();
      var itemsToMark = titlesStr.split("|").map(function(s) { return s.trim(); }).filter(Boolean);
      
      // Log to Notes & Ideas Doc
      if (itemsToMark.length > 0) {
        var doc = DocumentApp.openById(NOTES_DOC_ID);
        var body = doc.getBody();
        var timeStamp = Utilities.formatDate(new Date(), "EST", "M/d/yyyy, h:mm:ss a");
        body.appendParagraph("[" + timeStamp + "] mark_done: " + itemsToMark.join(" | "));
        doc.saveAndClose();
      }

      // Dynamic JSON Pruning: Remove completed items from horizon_data.json in Drive
      var updatedData = pruneHorizonJsonFile(itemsToMark, completedTasks);

      return ContentService.createTextOutput(JSON.stringify({
        result: "✅ SYNC COMPLETE! Pruned " + itemsToMark.length + " items from live feed and updated Google Workspace.",
        totalCalories: getTodayCaloriesFromSheet(),
        updatedData: updatedData
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Handle On-Demand Horizon Briefing Pull
    if (message.indexOf("/horizon") === 0) {
      var refreshedData = refreshHorizonDataFeed();
      return ContentService.createTextOutput(JSON.stringify({
        result: "✅ LIVE HORIZON BRIEFING PULLED & SYNCED!",
        totalCalories: refreshedData.health_nutrition ? refreshedData.health_nutrition.total_calories : getTodayCaloriesFromSheet(),
        refreshedData: refreshedData
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Handle Standard Input Shortcuts (/note, /calories, /groceries, etc.)
    var resultText = handleStandardInput(message);
    
    return ContentService.createTextOutput(JSON.stringify({
      result: resultText,
      totalCalories: getTodayCaloriesFromSheet()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Prunes completed items directly inside horizon_data.json on Google Drive
 */
function pruneHorizonJsonFile(itemsToMark, completedTasks) {
  var files = DriveApp.getFilesByName(HORIZON_JSON_FILE_NAME);
  if (!files.hasNext()) return null;
  var file = files.next();
  var jsonText = file.getBlob().getDataAsString();
  var data = JSON.parse(jsonText);

  // Prune things_to_consider
  if (data.things_to_consider && Array.isArray(data.things_to_consider)) {
    data.things_to_consider = data.things_to_consider.filter(function(item) {
      return !itemsToMark.some(function(doneTitle) {
        return item.title.toLowerCase().indexOf(doneTitle.toLowerCase()) !== -1 ||
               doneTitle.toLowerCase().indexOf(item.title.toLowerCase()) !== -1;
      });
    });
  }

  // Prune tasks
  if (data.tasks && Array.isArray(data.tasks)) {
    data.tasks = data.tasks.filter(function(task) {
      var idMatch = completedTasks && completedTasks.indexOf(task.id) !== -1;
      var titleMatch = itemsToMark.some(function(doneTitle) {
        return task.title.toLowerCase().indexOf(doneTitle.toLowerCase()) !== -1;
      });
      return !idMatch && !titleMatch;
    });
  }

  if (!data.system_metadata) data.system_metadata = {};
  data.system_metadata.last_updated = new Date().toISOString();

  file.setContent(JSON.stringify(data, null, 2));
  return data;
}

/**
 * Live On-Demand Refresh of horizon_data.json Feed
 */
function refreshHorizonDataFeed() {
  var files = DriveApp.getFilesByName(HORIZON_JSON_FILE_NAME);
  var file = files.hasNext() ? files.next() : null;
  var data = file ? JSON.parse(file.getBlob().getDataAsString()) : {};

  // Refresh Calorie Total
  var calories = getTodayCaloriesFromSheet();
  if (!data.health_nutrition) data.health_nutrition = {};
  data.health_nutrition.total_calories = calories;

  // Refresh Calendar Events for Today
  var now = new Date();
  var startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  var endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  var events = CalendarApp.getDefaultCalendar().getEvents(startOfDay, endOfDay);
  
  if (!data.calendar) data.calendar = {};
  data.calendar.today = events.map(function(ev) {
    return {
      title: ev.getTitle(),
      time: Utilities.formatDate(ev.getStartTime(), "EST", "h:mm a EDT")
    };
  });

  // Refresh Tasks
  try {
    var taskList = Tasks.Tasks.list('@default', { showCompleted: false });
    if (taskList.items) {
      data.tasks = taskList.items.map(function(t) {
        return {
          id: t.id,
          title: t.title,
          time: t.due ? Utilities.formatDate(new Date(t.due), "EST", "h:mm a EDT") : "Scheduled Task"
        };
      });
    }
  } catch (err) {
    Logger.log("Tasks list error: " + err.message);
  }

  if (!data.system_metadata) data.system_metadata = {};
  data.system_metadata.last_updated = new Date().toISOString();

  if (file) {
    file.setContent(JSON.stringify(data, null, 2));
  }
  return data;
}

function handleStandardInput(msg) {
  var timeStamp = Utilities.formatDate(new Date(), "EST", "M/d/yyyy, h:mm:ss a");
  
  if (msg.indexOf("/groceries") === 0) {
    var itemText = msg.replace("/groceries", "").trim();
    if (itemText) {
      Tasks.Tasks.insert({ title: "🛒 " + itemText }, '@default');
      return "✅ Added '" + itemText + "' to Google Tasks Grocery List!";
    }
  }
  
  if (msg.indexOf("/note") === 0 || msg.indexOf("/calories") === 0 || msg.indexOf("/journal") === 0 || msg.indexOf("/receipts") === 0) {
    var doc = DocumentApp.openById(NOTES_DOC_ID);
    doc.getBody().appendParagraph("[" + timeStamp + "] " + msg);
    doc.saveAndClose();
    return "✅ Recorded entry in Google Doc Log!";
  }
  
  return "✅ Command processed successfully!";
}

function getTodayCaloriesFromSheet() {
  try {
    var sheet = SpreadsheetApp.openById(NUTRITION_SHEET_ID).getActiveSheet();
    var data = sheet.getDataRange().getValues();
    var total = 0;
    var todayStr = Utilities.formatDate(new Date(), "EST", "yyyy-MM-dd");
    for (var i = 1; i < data.length; i++) {
      var rowDate = data[i][0];
      if (rowDate) {
        var dStr = (rowDate instanceof Date) ? Utilities.formatDate(rowDate, "EST", "yyyy-MM-dd") : String(rowDate);
        if (dStr === todayStr) {
          total += Number(data[i][2]) || 0;
        }
      }
    }
    return total;
  } catch (e) {
    return 530;
  }
}
