/**
 * AEGIS Master Webhook & Ingestion Engine (Option A)
 *
 * Complete Workspace Router & HORIZON Integration:
 * 1. /calories   -> Gemini AI Macro Extraction -> Nutrition Sheet
 * 2. /journal    -> Dedicated Journal Document
 * 3. /receipts   -> Expense Intake -> Finance Sheet
 * 4. /groceries  -> Google Tasks
 * 5. /note       -> Notes & Ideas Document
 * 6. mark_done   -> Google Tasks Complete + Horizon JSON Pruning
 * 7. /horizon    -> Trigger Gemini HORIZON -> overwrite canonical Doc
 *                   -> process Doc -> refresh AEGIS JSON
 * 8. horizon_sync -> Same full autonomous HORIZON pipeline
 * 9. GET getLatestHorizonBriefing -> Return canonical Doc as structured JSON
 */

function getGeminiConfig() {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty("GEMINI_API_KEY");
  const model = props.getProperty("GEMINI_MODEL") || "gemini-3.6-flash";
  if (!apiKey) throw new Error("GEMINI_API_KEY not found in Script Properties.");
  return { apiKey: apiKey, model: model };
}

function callGemini(prompt) {
  const cfg = getGeminiConfig();
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(cfg.model) + ":generateContent";
  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { "x-goog-api-key": cfg.apiKey },
    payload: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    }),
    muteHttpExceptions: true
  });
  const code = response.getResponseCode();
  const text = response.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error("Gemini API HTTP " + code + " using model " + cfg.model + ": " + text);
  }
  const json = JSON.parse(text);
  const parts = json.candidates &&
    json.candidates[0] &&
    json.candidates[0].content &&
    json.candidates[0].content.parts;
  if (!parts || !parts.length) {
    throw new Error("Gemini returned no usable content using model " + cfg.model + ".");
  }
  return parts.map(function(part) { return part.text || ""; }).join("").trim();
}

function testGeminiConnection() {
  const cfg = getGeminiConfig();
  const reply = callGemini("Reply with exactly: AEGIS GEMINI OK");
  Logger.log("Model: " + cfg.model);
  Logger.log("Reply: " + reply);
  return { status: "ok", model: cfg.model, reply: reply };
}

const CONFIG = {
  CALORIES_SHEET_ID:
    "10SzZC5aQi2R_r7ulcukpozQ4Ws0Pbo5KqI32os_idlk",

  FINANCE_SHEET_ID:
    "1Oc2X4CyS9C8Uj58WvsJaOyj1MIdXEKoZ0P7lEsGfP2g",

  GROCERY_SHEET_ID:
    "15UyNwGfBSwXUnEdIaonT-vF2ynxz5dp1JR0r1Rp06BM",

  JOURNAL_DOC_ID:
    "1lAnHLHPG6v9lnm4ExQmAU4Q9LPo97pUTua04G__nNd8",

  NOTES_DOC_ID:
    "1XuPuZkyzCoFk1vWt4kdU-0daoiscaLIaSuoiqKLWsvc",

  LATEST_HORIZON_BRIEFING_DOC_ID:
    "1Id8HjrUGK8HL8pv5lOcKwK0A7fNY8mQ1Fg4HerM7HJ4",

  HORIZON_JSON_NAME: "horizon_data.json",

  TIMEZONE: "America/New_York"
};

/* ============================================================
   GET ROUTER
   ============================================================ */

function doGet(e) {
  var action =
    (e && e.parameter && e.parameter.action)
      ? e.parameter.action
      : "";

  if (
    action === "getHorizonData" ||
    action === "getSummary"
  ) {
    var jsonFiles =
      DriveApp.getFilesByName(CONFIG.HORIZON_JSON_NAME);

    if (jsonFiles.hasNext()) {
      var jsonContent =
        jsonFiles.next()
          .getBlob()
          .getDataAsString();

      return ContentService
        .createTextOutput(jsonContent)
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (action === "getIntelligence") {
    var forceIntel = String(e.parameter.force || "") === "1";
    return ContentService
      .createTextOutput(JSON.stringify(getIntelligenceFeedV24(forceIntel)))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "capabilities") {
    return jsonOutput(getAegisCapabilities());
  }

  if (action === "getNotifications") {
    ensureAppointmentReminders();
    return jsonOutput({ status: "success", notifications: getServerNotifications(false) });
  }

  if (action === "getRecentFinance") {
    var hours = Math.max(1, Math.min(168, Number(e.parameter.hours) || 72));
    return jsonOutput(getRecentFinanceActivity(hours));
  }

  if (action === "health") {
    return jsonOutput(getAegisHealth());
  }

  if (action === "reverseGeocode") {
    var lat = Number(e.parameter.lat);
    var lon = Number(e.parameter.lon);
    return ContentService
      .createTextOutput(JSON.stringify(reverseGeocodeLocation(lat, lon)))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "getLatestHorizonBriefing") {
    return ContentService
      .createTextOutput(
        JSON.stringify(getLatestHorizonBriefing())
      )
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(
      JSON.stringify({
        status: "online",
        backend_version: "2.4.0",
        totalCalories: getTodayCaloriesFromSheet()
      })
    )
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
   POST ROUTER
   ============================================================ */

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);

    var message =
      (contents.message || "").trim();

    var action =
      contents.action || "";

    var completedTasks =
      contents.completedTasks || [];

    var taskId =
      contents.task_id || null;

    if (
      taskId &&
      completedTasks.indexOf(taskId) === -1
    ) {
      completedTasks.push(taskId);
    }

    if (action === "ack_notification") {
      return jsonOutput(ackServerNotification(contents.notificationId));
    }

    if (action === "resolve_calendar_event") {
      return jsonOutput({ status: "success", event: resolveCalendarEventText(contents.text || "") });
    }

    if (action === "create_calendar_event") {
      return jsonOutput(createCalendarEventFromResolved(contents.event || {}));
    }

    if (action === "refresh_intelligence") {
      return jsonOutput(getIntelligenceFeedV24(true));
    }

    if (action === "install_automation_triggers") {
      return jsonOutput({ status: "success", triggers: installAegisAutomationTriggers() });
    }

    if (
      action === "mark_done" ||
      message.indexOf("mark_done:") === 0 ||
      message.indexOf("/note mark_done:") === 0
    ) {

      for (
        var i = 0;
        i < completedTasks.length;
        i++
      ) {
        try {
          Tasks.Tasks.patch(
            { status: "completed" },
            "@default",
            completedTasks[i]
          );
        } catch (err) {
          Logger.log(
            "Tasks patch error: " +
            err.message
          );
        }
      }

      var titlesStr =
        message
          .replace("/note mark_done:", "")
          .replace("mark_done:", "")
          .trim();

      var itemsToMark =
        titlesStr
          .split("|")
          .map(function(s) {
            return s.trim();
          })
          .filter(Boolean);

      if (itemsToMark.length > 0) {
        var doc =
          DocumentApp.openById(
            CONFIG.NOTES_DOC_ID
          );

        var timeStamp =
          Utilities.formatDate(
            new Date(),
            CONFIG.TIMEZONE,
            "M/d/yyyy, h:mm:ss a"
          );

        doc
          .getBody()
          .appendParagraph(
            "[" +
            timeStamp +
            "] mark_done: " +
            itemsToMark.join(" | ")
          );

        doc.saveAndClose();
      }

      var updatedData =
        pruneHorizonJsonFile(
          itemsToMark,
          completedTasks
        );

      return ContentService
        .createTextOutput(
          JSON.stringify({
            result:
              "✅ SYNC COMPLETE! Pruned " +
              itemsToMark.length +
              " item(s) from live feed and updated Google Workspace.",

            totalCalories:
              getTodayCaloriesFromSheet(),

            updatedData:
              updatedData
          })
        )
        .setMimeType(
          ContentService.MimeType.JSON
        );
    }

    if (
      message.indexOf("/horizon") === 0 ||
      action === "refresh_briefing" ||
      action === "horizon_sync" ||
      contents.command === "/horizon"
    ) {
      var generationResult =
        runHorizonPipeline();

      var refreshedData =
        refreshHorizonDataFeed();

      return ContentService
        .createTextOutput(
          JSON.stringify({
            result:
              "✅ HORIZON GENERATED, WRITTEN TO GOOGLE DOC, AND AEGIS REFRESHED!",

            generation:
              generationResult,

            totalCalories:
              getTodayCaloriesFromSheet(),

            refreshedData:
              refreshedData
          })
        )
        .setMimeType(
          ContentService.MimeType.JSON
        );
    }

    if (
      message.indexOf("/calories") === 0
    ) {
      var foodInput =
        message
          .replace("/calories", "")
          .trim();

      var calorieResult =
        handleCalorieLogging(foodInput);

      return ContentService
        .createTextOutput(
          JSON.stringify({
            result:
              calorieResult,

            totalCalories:
              getTodayCaloriesFromSheet()
          })
        )
        .setMimeType(
          ContentService.MimeType.JSON
        );
    }

    if (
      message.indexOf("/journal") === 0 ||
      message.indexOf("/vent") === 0
    ) {
      var journalText =
        message
          .replace(
            /^(\/journal|\/vent)\s*/i,
            ""
          )
          .trim();

      var journalResult =
        handleJournalLogging(
          journalText
        );

      return ContentService
        .createTextOutput(
          JSON.stringify({
            result:
              journalResult,

            totalCalories:
              getTodayCaloriesFromSheet()
          })
        )
        .setMimeType(
          ContentService.MimeType.JSON
        );
    }

    if (
      message.indexOf("/receipts") === 0 ||
      message.indexOf("/finance") === 0
    ) {
      var financeText =
        message
          .replace(
            /^(\/receipts|\/finance)\s*/i,
            ""
          )
          .trim();

      var financeResult =
        handleFinanceLogging(
          financeText
        );

      return ContentService
        .createTextOutput(
          JSON.stringify({
            result:
              financeResult,

            totalCalories:
              getTodayCaloriesFromSheet()
          })
        )
        .setMimeType(
          ContentService.MimeType.JSON
        );
    }

    if (
      message.indexOf("/groceries") === 0
    ) {
      var groceryInput =
        message
          .replace("/groceries", "")
          .trim();

      var groceryResult =
        handleGroceryDispatch(
          groceryInput
        );

      return ContentService
        .createTextOutput(
          JSON.stringify({
            result:
              groceryResult,

            totalCalories:
              getTodayCaloriesFromSheet()
          })
        )
        .setMimeType(
          ContentService.MimeType.JSON
        );
    }

    var noteText =
      message
        .replace(/^\/note\s*/i, "")
        .trim();

    var timeStamp =
      Utilities.formatDate(
        new Date(),
        CONFIG.TIMEZONE,
        "M/d/yyyy, h:mm:ss a"
      );

    var doc =
      DocumentApp.openById(
        CONFIG.NOTES_DOC_ID
      );

    doc
      .getBody()
      .appendParagraph(
        "[" +
        timeStamp +
        "] " +
        noteText
      );

    doc.saveAndClose();

    return ContentService
      .createTextOutput(
        JSON.stringify({
          result:
            "✅ Logged entry to Notes & Ideas Log: " +
            noteText,

          totalCalories:
            getTodayCaloriesFromSheet()
        })
      )
      .setMimeType(
        ContentService.MimeType.JSON
      );

  } catch (err) {
    return ContentService
      .createTextOutput(
        JSON.stringify({
          status: "error",
          error: err.message
        })
      )
      .setMimeType(
        ContentService.MimeType.JSON
      );
  }
}

function handleCalorieLogging(foodText) {
  if (!foodText) {
    return "⚠️ Please provide food details to log.";
  }

  var parsedItems =
    callGeminiForMacros(foodText);

  var sheet =
    SpreadsheetApp
      .openById(
        CONFIG.CALORIES_SHEET_ID
      )
      .getActiveSheet();

  var dateStr =
    Utilities.formatDate(
      new Date(),
      CONFIG.TIMEZONE,
      "M/d/yyyy"
    );

  var timeStr =
    Utilities.formatDate(
      new Date(),
      CONFIG.TIMEZONE,
      "h:mm:ss a"
    );

  if (
    !parsedItems ||
    parsedItems.length === 0
  ) {
    sheet.appendRow([
      dateStr,
      timeStr,
      foodText,
      "1 serving",
      0,
      0,
      0,
      0,
      0,
      "Logged via AEGIS Dashboard"
    ]);

    return (
      "⚠️ Logged '" +
      foodText +
      "' to Sheet " +
      "(Macros pending - verify GEMINI_API_KEY in Script Properties)."
    );
  }

  var summaryLines = [];

  for (
    var i = 0;
    i < parsedItems.length;
    i++
  ) {
    var item =
      parsedItems[i];

    var cals =
      Number(item.calories) || 0;

    var prot =
      Number(item.protein) || 0;

    var carbs =
      Number(item.carbs) || 0;

    var fat =
      Number(item.fat) || 0;

    var sod =
      Number(item.sodium) || 0;

    sheet.appendRow([
      dateStr,
      timeStr,
      item.item || foodText,
      item.portion || "1 serving",
      cals,
      prot,
      carbs,
      fat,
      sod,
      "Logged via AEGIS AI"
    ]);

    summaryLines.push(
      "• " +
      item.item +
      " (" +
      (item.portion || "1 serv") +
      "): " +
      cals +
      " kcal | " +
      prot +
      "g P | " +
      carbs +
      "g C | " +
      fat +
      "g F"
    );
  }

  var dailyTotal =
    getTodayCaloriesFromSheet();

  return (
    "✅ LOGGED NUTRITION VIA GEMINI AI:\n" +
    summaryLines.join("\n") +
    "\n\n📊 Daily Total: " +
    dailyTotal +
    " kcal"
  );
}

function callGeminiForMacros(foodText) {
  try {
    const prompt =
      'You are a clinical nutritionist. Extract or accurately estimate the nutritional breakdown ' +
      'for this food description: "' + foodText + '".\n' +
      'Return ONLY a raw JSON array of objects with the exact schema:\n' +
      '[{"item":"Full specific name","portion":"Serving size","calories":140,' +
      '"protein":20.0,"carbs":8.0,"fat":2.5,"sodium":150}]\n' +
      'Do NOT include markdown formatting or backticks. Return raw JSON.';
    const raw = callGemini(prompt);
    const clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    Logger.log("Gemini macro extraction error: " + e.message);
    return null;
  }
}

function handleJournalLogging(
  journalText
) {
  if (!journalText) {
    return "⚠️ Please provide content for your journal entry.";
  }

  var doc =
    DocumentApp.openById(
      CONFIG.JOURNAL_DOC_ID
    );

  var timeStamp =
    Utilities.formatDate(
      new Date(),
      CONFIG.TIMEZONE,
      "M/d/yyyy, h:mm:ss a"
    );

  var body =
    doc.getBody();

  body.appendParagraph(
    "\n--- JOURNAL [" +
    timeStamp +
    "] ---"
  );

  body.appendParagraph(
    journalText
  );

  doc.saveAndClose();

  return (
    "✅ Logged reflection to Journal Pad:\n\"" +
    (
      journalText.length > 80
        ? journalText.substring(0, 80) + "..."
        : journalText
    ) +
    "\""
  );
}

function handleFinanceLogging(
  financeText
) {
  if (!financeText) {
    return (
      "⚠️ Please provide expense details " +
      "(e.g. Target $45.20 Groceries)."
    );
  }

  var sheet =
    SpreadsheetApp
      .openById(
        CONFIG.FINANCE_SHEET_ID
      )
      .getActiveSheet();

  var dateStr =
    Utilities.formatDate(
      new Date(),
      CONFIG.TIMEZONE,
      "yyyy-MM-dd"
    );

  var timeStr =
    Utilities.formatDate(
      new Date(),
      CONFIG.TIMEZONE,
      "h:mm:ss a"
    );

  var amountMatch =
    financeText.match(
      /\$?([0-9]+(?:\.[0-9]{2})?)/
    );

  var amount =
    amountMatch
      ? Number(amountMatch[1])
      : 0;

  var description =
    financeText
      .replace(
        /\$?([0-9]+(?:\.[0-9]{2})?)/,
        ""
      )
      .trim();

  sheet.appendRow([
    dateStr,
    timeStr,
    description ||
      "General Purchase",
    amount,
    "Discretionary / General",
    "Credit Card / Debit",
    "Logged via AEGIS Dashboard"
  ]);

  return (
    "✅ Recorded Expense in Receipts & Expense Intake Log:\n• " +
    (
      description ||
      "Purchase"
    ) +
    ": $" +
    amount.toFixed(2)
  );
}

function handleGroceryDispatch(
  groceryText
) {
  if (!groceryText) {
    return "⚠️ No grocery items provided.";
  }

  var items =
    groceryText
      .split("|")
      .map(function(s) {
        return s.trim();
      })
      .filter(Boolean);

  var added = [];

  for (
    var i = 0;
    i < items.length;
    i++
  ) {
    var cleanName =
      items[i]
        .replace(/^🛒\s*/, "");

    try {
      Tasks.Tasks.insert(
        {
          title:
            "🛒 " +
            cleanName
        },
        "@default"
      );

      added.push(
        cleanName
      );
    } catch (e) {
      Logger.log(
        "Tasks insert error: " +
        e.message
      );
    }
  }

  if (added.length > 0) {
    return (
      "✅ Added " +
      added.length +
      " item(s) to Google Tasks Grocery List:\n• " +
      added.join("\n• ")
    );
  }

  return (
    "✅ Dispatched: " +
    groceryText
  );
}

function runHorizonPipelineUnsafe() {
  var now =
    new Date();

  var tomorrow =
    new Date(now);

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  var todayEvents =
    CalendarApp
      .getDefaultCalendar()
      .getEventsForDay(now)
      .map(function(e) {
        return (
          Utilities.formatDate(
            e.getStartTime(),
            CONFIG.TIMEZONE,
            "hh:mm a"
          ) +
          " - " +
          e.getTitle()
        );
      })
      .join("\n");

  var tomorrowEvents =
    CalendarApp
      .getDefaultCalendar()
      .getEventsForDay(tomorrow)
      .map(function(e) {
        return (
          Utilities.formatDate(
            e.getStartTime(),
            CONFIG.TIMEZONE,
            "hh:mm a"
          ) +
          " - " +
          e.getTitle()
        );
      })
      .join("\n");

  var pendingTasks = "";

  try {
    var taskLists =
      Tasks.Tasklists.list().items;

    if (
      taskLists &&
      taskLists.length > 0
    ) {
      var taskResult =
        Tasks.Tasks.list(
          taskLists[0].id,
          {
            showCompleted: false
          }
        );

      if (taskResult.items) {
        pendingTasks =
          taskResult.items
            .map(function(t) {
              return t.title;
            })
            .join(", ");
      }
    }
  } catch (e) {
    Logger.log(
      "Horizon Tasks API unavailable: " +
      e.message
    );

    pendingTasks =
      "Tasks API unavailable.";
  }

  var prompt =
    "You are HORIZON, an executive briefing system for Brian in Durham, NC.\n" +
    "Generate a structured Daily Itinerary & Executive Briefing for " +
    Utilities.formatDate(
      now,
      CONFIG.TIMEZONE,
      "EEEE, MMMM d, yyyy"
    ) +
    ".\n\n" +
    "Context:\n" +
    "- Today's Calendar:\n" +
    (
      todayEvents ||
      "None"
    ) +
    "\n" +
    "- Tomorrow's Calendar:\n" +
    (
      tomorrowEvents ||
      "None"
    ) +
    "\n" +
    "- Active Tasks: " +
    (
      pendingTasks ||
      "None"
    ) +
    "\n" +
    "- Weather: Durham, NC conditions.\n\n" +
    "Include all standard HORIZON sections: " +
    "Header/Somatic, Weather, Health/KINETIC, SENTINEL-FIN, " +
    "Calendar, Tasks, Gmail/Tracking, Things to Consider, " +
    "and Personal Newspaper.\n\n" +
    "Output clean, formatted Markdown suitable for a readable daily briefing.";

  var generatedBriefing = callGemini(prompt);
  if (!generatedBriefing) {
    throw new Error("Gemini returned an empty HORIZON briefing.");
  }
  validateHorizonBriefing(generatedBriefing);

  var doc =
    DocumentApp.openById(
      CONFIG
        .LATEST_HORIZON_BRIEFING_DOC_ID
    );

  var body =
    doc.getBody();

  body.clear();

  body.setText(
    generatedBriefing
  );

  doc.saveAndClose();

  return {
    status:
      "success",

    message:
      "HORIZON briefing generated and written to canonical Google Doc.",

    document_id:
      CONFIG
        .LATEST_HORIZON_BRIEFING_DOC_ID,

    generated_at:
      new Date().toISOString()
  };
}

function getLatestHorizonBriefing() {
  var doc =
    DocumentApp.openById(
      CONFIG
        .LATEST_HORIZON_BRIEFING_DOC_ID
    );

  var file =
    DriveApp.getFileById(
      CONFIG
        .LATEST_HORIZON_BRIEFING_DOC_ID
    );

  var body =
    doc.getBody();

  return {
    source:
      "google_docs",

    document_id:
      CONFIG
        .LATEST_HORIZON_BRIEFING_DOC_ID,

    document_title:
      doc.getName(),

    last_updated:
      file
        .getLastUpdated()
        .toISOString(),

    fetched_at:
      new Date()
        .toISOString(),

    plain_text:
      body.getText(),

    blocks:
      extractHorizonDocumentBlocks(
        body
      )
  };
}

function extractHorizonDocumentBlocks(
  body
) {
  var blocks = [];

  for (
    var i = 0;
    i < body.getNumChildren();
    i++
  ) {
    var child =
      body.getChild(i);

    var type =
      child.getType();

    if (
      type ===
      DocumentApp.ElementType.PARAGRAPH
    ) {
      var paragraph =
        child.asParagraph();

      var text =
        paragraph
          .getText()
          .trim();

      if (!text) {
        continue;
      }

      var heading =
        paragraph.getHeading();

      if (
        heading &&
        heading !==
          DocumentApp
            .ParagraphHeading
            .NORMAL
      ) {
        blocks.push({
          type:
            "heading",

          level:
            headingToLevel(
              heading
            ),

          text:
            text
        });
      } else {
        blocks.push({
          type:
            "paragraph",

          text:
            text
        });
      }

      continue;
    }

    if (
      type ===
      DocumentApp.ElementType.LIST_ITEM
    ) {
      var listItem =
        child.asListItem();

      var listText =
        listItem
          .getText()
          .trim();

      if (!listText) {
        continue;
      }

      blocks.push({
        type:
          "list_item",

        text:
          listText,

        nesting_level:
          listItem
            .getNestingLevel(),

        glyph_type:
          String(
            listItem
              .getGlyphType()
          )
      });

      continue;
    }

    if (
      type ===
      DocumentApp.ElementType.TABLE
    ) {
      var table =
        child.asTable();

      var rows = [];

      for (
        var r = 0;
        r < table.getNumRows();
        r++
      ) {
        var row =
          table.getRow(r);

        var cells = [];

        for (
          var c = 0;
          c < row.getNumCells();
          c++
        ) {
          cells.push(
            row
              .getCell(c)
              .getText()
              .trim()
          );
        }

        rows.push(
          cells
        );
      }

      blocks.push({
        type:
          "table",

        rows:
          rows
      });

      continue;
    }

    if (
      type ===
      DocumentApp
        .ElementType
        .HORIZONTAL_RULE
    ) {
      blocks.push({
        type:
          "horizontal_rule"
      });
    }
  }

  return blocks;
}

function headingToLevel(
  heading
) {
  switch (heading) {
    case DocumentApp
      .ParagraphHeading
      .TITLE:
      return 1;

    case DocumentApp
      .ParagraphHeading
      .SUBTITLE:
      return 2;

    case DocumentApp
      .ParagraphHeading
      .HEADING1:
      return 1;

    case DocumentApp
      .ParagraphHeading
      .HEADING2:
      return 2;

    case DocumentApp
      .ParagraphHeading
      .HEADING3:
      return 3;

    case DocumentApp
      .ParagraphHeading
      .HEADING4:
      return 4;

    case DocumentApp
      .ParagraphHeading
      .HEADING5:
      return 5;

    case DocumentApp
      .ParagraphHeading
      .HEADING6:
      return 6;

    default:
      return null;
  }
}

function pruneHorizonJsonFile(
  itemsToMark,
  completedTasks
) {
  var files =
    DriveApp.getFilesByName(
      CONFIG.HORIZON_JSON_NAME
    );

  if (!files.hasNext()) {
    return null;
  }

  var file =
    files.next();

  var jsonText =
    file
      .getBlob()
      .getDataAsString();

  var data =
    JSON.parse(
      jsonText
    );

  if (
    data.things_to_consider &&
    Array.isArray(
      data.things_to_consider
    )
  ) {
    data.things_to_consider =
      data.things_to_consider
        .filter(function(item) {
          return !itemsToMark
            .some(function(doneTitle) {
              return (
                item.title
                  .toLowerCase()
                  .indexOf(
                    doneTitle
                      .toLowerCase()
                  ) !== -1 ||
                doneTitle
                  .toLowerCase()
                  .indexOf(
                    item.title
                      .toLowerCase()
                  ) !== -1
              );
            });
        });
  }

  if (
    data.tasks &&
    Array.isArray(data.tasks)
  ) {
    data.tasks =
      data.tasks
        .filter(function(task) {
          var idMatch =
            completedTasks &&
            completedTasks
              .indexOf(
                task.id
              ) !== -1;

          var titleMatch =
            itemsToMark
              .some(function(doneTitle) {
                return (
                  task.title
                    .toLowerCase()
                    .indexOf(
                      doneTitle
                        .toLowerCase()
                    ) !== -1
                );
              });

          return (
            !idMatch &&
            !titleMatch
          );
        });
  }

  if (
    !data.system_metadata
  ) {
    data.system_metadata = {};
  }

  data
    .system_metadata
    .last_updated =
      new Date()
        .toISOString();

  file.setContent(
    JSON.stringify(
      data,
      null,
      2
    )
  );

  return data;
}

function refreshHorizonDataFeed() {
  var files =
    DriveApp.getFilesByName(
      CONFIG.HORIZON_JSON_NAME
    );

  var file =
    files.hasNext()
      ? files.next()
      : null;

  var data =
    file
      ? JSON.parse(
          file
            .getBlob()
            .getDataAsString()
        )
      : {};

  try {
    data.briefing =
      getLatestHorizonBriefing();
  } catch (briefingErr) {
    Logger.log(
      "Latest Horizon Briefing read error: " +
      briefingErr.message
    );

    data.briefing =
      data.briefing || {};

    data.briefing.read_error =
      briefingErr.message;

    data.briefing.read_error_at =
      new Date()
        .toISOString();
  }

  data.health_nutrition =
    data.health_nutrition || {};

  data
    .health_nutrition
    .total_calories =
      getTodayCaloriesFromSheet();

  var now = new Date();
  var tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  function serializeCalendarDay(date) {
    return CalendarApp.getDefaultCalendar().getEventsForDay(date).map(function(ev) {
      return {
        title: ev.getTitle(),
        time: Utilities.formatDate(ev.getStartTime(), CONFIG.TIMEZONE, "h:mm a z"),
        start: ev.getStartTime().toISOString(),
        end: ev.getEndTime().toISOString(),
        all_day: ev.isAllDayEvent()
      };
    });
  }

  data.calendar = data.calendar || {};
  data.calendar.today = serializeCalendarDay(now);
  data.calendar.tomorrow = serializeCalendarDay(tomorrowDate);

  try {
    var taskList = Tasks.Tasks.list("@default", { showCompleted: false });
    var activeTaskItems = taskList.items || [];

    data.tasks = activeTaskItems.map(function(t) {
      return {
        id: t.id,
        title: t.title || "Untitled Task",
        time: t.due
          ? Utilities.formatDate(new Date(t.due), CONFIG.TIMEZONE, "h:mm a z")
          : "Google Task"
      };
    });

    delete data.groceries;
  } catch (err) {
    Logger.log("Tasks list error: " + err.message);
    data.tasks = data.tasks || [];
    delete data.groceries;
  }

  data.system_metadata =
    data.system_metadata || {};

  data
    .system_metadata
    .last_updated =
      new Date()
        .toISOString();

  data
    .system_metadata
    .briefing_source =
      "google_doc";

  data
    .system_metadata
    .briefing_document_id =
      CONFIG
        .LATEST_HORIZON_BRIEFING_DOC_ID;

  data.system_metadata.backend_version = "2.4.0";
  data.system_metadata.horizon_generation = getHorizonGenerationStatus();

  if (file) {
    file.setContent(
      JSON.stringify(
        data,
        null,
        2
      )
    );
  }

  return data;
}

function getTodayCaloriesFromSheet() {
  try {
    var sheet =
      SpreadsheetApp
        .openById(
          CONFIG.CALORIES_SHEET_ID
        )
        .getActiveSheet();

    var data =
      sheet
        .getDataRange()
        .getValues();

    var total = 0;

    var todayStr =
      Utilities.formatDate(
        new Date(),
        CONFIG.TIMEZONE,
        "yyyy-MM-dd"
      );

    for (
      var i = 1;
      i < data.length;
      i++
    ) {
      var rowDate =
        data[i][0];

      if (rowDate) {
        var dStr =
          rowDate instanceof Date
            ? Utilities.formatDate(
                rowDate,
                CONFIG.TIMEZONE,
                "yyyy-MM-dd"
              )
            : String(rowDate);

        if (
          dStr === todayStr
        ) {
          total +=
            Number(
              data[i][4]
            ) || 0;
        }
      }
    }

    return total;
  } catch (e) {
    Logger.log(
      "Calorie total error: " +
      e.message
    );

    return 0;
  }
}

var AEGIS_RSS_SOURCES = [
  { name: "INDY Week", category: "local-triangle", sourceType: "Editorial", priority: 8, url: "https://indyweek.com/feed/" },
  { name: "The Assembly NC", category: "nc-policy", sourceType: "Editorial", priority: 8, url: "https://theassemblync.com/feed/" },
  { name: "WRAL Top News", category: "local-triangle", sourceType: "Editorial", priority: 9, url: "https://www.wral.com/news/rss/48/" },
  { name: "WRAL Local Triangle", category: "local-triangle", sourceType: "Editorial", priority: 10, url: "https://www.wral.com/news/local/rss/142/" },
  { name: "ABC11", category: "local-triangle", sourceType: "Editorial", priority: 8, url: "https://abc11.com/feed/" },
  { name: "CBS 17", category: "local-triangle", sourceType: "Editorial", priority: 8, url: "https://www.cbs17.com/feed/" },
  { name: "City of Durham", category: "local-triangle", sourceType: "Official", priority: 10, url: "https://www.durhamnc.gov/RSSFeed.aspx?ModID=1&CID=All-0" },
  { name: "North Carolina Health News", category: "nc-policy", sourceType: "Editorial", priority: 8, url: "https://www.northcarolinahealthnews.org/feed/" },
  { name: "Steam Platform News", category: "pc-gaming", sourceType: "Official", priority: 8, url: "https://store.steampowered.com/feeds/news.xml" },
  { name: "Factorio", category: "game-updates", sourceType: "Official", priority: 10, url: "https://store.steampowered.com/feeds/news/app/427520" },
  { name: "Street Fighter 6", category: "game-updates", sourceType: "Official", priority: 10, url: "https://store.steampowered.com/feeds/news/app/1364780" },
  { name: "Rocket League", category: "game-updates", sourceType: "Official", priority: 10, url: "https://store.steampowered.com/feeds/news/app/252950" },
  { name: "HELLDIVERS 2", category: "game-updates", sourceType: "Official", priority: 10, url: "https://store.steampowered.com/feeds/news/app/553850" },
  { name: "Overwatch Official News", category: "game-updates", sourceType: "Official", priority: 10, url: "https://news.blizzard.com/en-us/feed/overwatch" },
  { name: "Rock Paper Shotgun", category: "pc-gaming", sourceType: "Editorial", priority: 7, url: "https://www.rockpapershotgun.com/feed" },
  { name: "PC Gamer", category: "pc-gaming", sourceType: "Editorial", priority: 7, url: "https://www.pcgamer.com/rss" },
  { name: "Eurogamer", category: "pc-gaming", sourceType: "Editorial", priority: 7, url: "https://www.eurogamer.net/feed" },
  { name: "Digital Foundry", category: "pc-gaming", sourceType: "Editorial", priority: 9, url: "https://www.eurogamer.net/feed/digital-foundry" },
  { name: "GamesIndustry.biz", category: "industry", sourceType: "Editorial", priority: 8, url: "https://www.gamesindustry.biz/feed" },
  { name: "VGC", category: "industry", sourceType: "Editorial", priority: 7, url: "https://www.videogameschronicle.com/feed/" },
  { name: "IsThereAnyDeal", category: "deals", sourceType: "Aggregator", priority: 7, url: "https://isthereanydeal.com/rss/deals/" },
  { name: "r/EscapefromTarkov", category: "tarkov", sourceType: "Community", priority: 7, url: "https://www.reddit.com/r/EscapefromTarkov/.rss" },
  { name: "r/EscapeFromTarkovArena", category: "tarkov", sourceType: "Community", priority: 6, url: "https://www.reddit.com/r/EscapeFromTarkovArena/.rss" },
  { name: "Tarkov Wiki Recent Changes", category: "tarkov", sourceType: "Community", priority: 6, url: "https://escapefromtarkov.fandom.com/wiki/Special:RecentChanges?feed=rss" }
];

function getAegisRssSources() {
  try {
    var response = UrlFetchApp.fetch(
      "https://raw.githubusercontent.com/Cokkles/aegis-itinerary-project/main/rss-sources.json",
      { muteHttpExceptions: true, headers: { "User-Agent": "AEGIS-Dashboard/2.4" } }
    );
    if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
      var parsed = JSON.parse(response.getContentText());
      if (parsed && Array.isArray(parsed.sources)) {
        return parsed.sources.filter(function(s) { return s.enabled !== false; });
      }
    }
  } catch (err) {
    Logger.log("RSS registry fetch failed; using embedded sources: " + err.message);
  }
  return AEGIS_RSS_SOURCES.filter(function(s) { return s.enabled !== false; });
}

function getIntelligenceFeed(forceRefresh) {
  var cache = CacheService.getScriptCache();
  var cacheKey = "aegis_intelligence_v23";
  if (!forceRefresh) {
    var cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  var all = [];
  var errors = [];
  getAegisRssSources().forEach(function(source) {
    try {
      var items = fetchRssItems(source);
      items.forEach(function(item) { all.push(item); });
    } catch (err) {
      errors.push({ source: source.name, error: err.message });
      Logger.log("RSS source error " + source.name + ": " + err.message);
    }
  });

  all.sort(function(a, b) {
    var ad = a.published ? new Date(a.published).getTime() : 0;
    var bd = b.published ? new Date(b.published).getTime() : 0;
    if (bd !== ad) return bd - ad;
    return (b.priority || 0) - (a.priority || 0);
  });

  var seen = {};
  all = all.filter(function(item) {
    var key = normalizeIntelTitle(item.title);
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  }).slice(0, 120);

  var categories = {};
  all.forEach(function(item) {
    categories[item.category] = categories[item.category] || [];
    if (categories[item.category].length < 20) categories[item.category].push(item);
  });

  var result = {
    status: "success",
    updated: new Date().toISOString(),
    items: all,
    categories: categories,
    source_count: getAegisRssSources().length,
    source_errors: errors
  };

  try { cache.put(cacheKey, JSON.stringify(result), 900); } catch (cacheErr) {}
  return result;
}

function fetchRssItems(source) {
  var response = UrlFetchApp.fetch(source.url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: { "User-Agent": "AEGIS-Dashboard/2.4 (+Google Apps Script)" }
  });
  var code = response.getResponseCode();
  if (code < 200 || code >= 300) throw new Error("HTTP " + code);
  var xml = response.getContentText();
  var root = XmlService.parse(xml).getRootElement();
  var entries = [];

  if (root.getName().toLowerCase() === "rss" || root.getChild("channel")) {
    var channel = root.getChild("channel") || root;
    entries = channel.getChildren("item").slice(0, 12).map(function(item) {
      return rssItemFromElement(item, source, false);
    });
  } else {
    var ns = root.getNamespace();
    entries = root.getChildren("entry", ns).slice(0, 12).map(function(entry) {
      return rssItemFromElement(entry, source, true, ns);
    });
  }
  return entries.filter(function(x) { return x.title && x.link; });
}

function rssItemFromElement(el, source, atom, ns) {
  function text(name) {
    var child = atom ? el.getChild(name, ns) : el.getChild(name);
    return child ? child.getText() : "";
  }
  var link = "";
  if (atom) {
    var links = el.getChildren("link", ns);
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href");
      var rel = links[i].getAttribute("rel");
      if (href && (!rel || rel.getValue() === "alternate")) { link = href.getValue(); break; }
    }
  } else {
    link = text("link");
  }
  var published = text(atom ? "updated" : "pubDate") || text(atom ? "published" : "dc:date");
  var description = text(atom ? "summary" : "description") || text(atom ? "content" : "content:encoded");
  var iso = "";
  if (published) {
    var d = new Date(published);
    if (!isNaN(d.getTime())) iso = d.toISOString();
  }
  return {
    title: text("title").trim(),
    link: link.trim(),
    published: iso,
    description: description,
    source: source.name,
    category: source.category,
    sourceType: source.sourceType,
    priority: source.priority
  };
}

function normalizeIntelTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(the|a|an|and|or|to|of|in|for|on|with)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 10)
    .join(" ");
}

function reverseGeocodeLocation(lat, lon) {
  if (!isFinite(lat) || !isFinite(lon)) return { status: "error", error: "Invalid coordinates." };
  try {
    var url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=" +
      encodeURIComponent(lat) + "&lon=" + encodeURIComponent(lon);
    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: { "User-Agent": "AEGIS-Dashboard/2.4" }
    });
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
      throw new Error("Reverse geocode HTTP " + response.getResponseCode());
    }
    var json = JSON.parse(response.getContentText());
    var a = json.address || {};
    var city = a.city || a.town || a.village || a.county || "Current location";
    var state = a.state || "";
    return { status: "success", label: city + (state ? ", " + state : ""), lat: lat, lon: lon };
  } catch (err) {
    return { status: "error", label: "Current location", error: err.message, lat: lat, lon: lon };
  }
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getAegisCapabilities() {
  return {
    status: "success",
    backend_version: "2.4.0",
    features: {
      horizon_generation: true,
      horizon_validation: true,
      scheduled_horizon: true,
      notifications: true,
      appointment_reminders: true,
      natural_language_calendar: true,
      recent_finance_72h: true,
      intelligence_v24: true,
      reverse_geocode: true,
      task_completion: true
    },
    horizon_generation: getHorizonGenerationStatus(),
    time: new Date().toISOString()
  };
}

function getAegisHealth() {
  var props = PropertiesService.getScriptProperties();
  return {
    status: "success",
    backend_version: "2.4.0",
    horizon: getHorizonGenerationStatus(),
    intelligence_last_refresh: props.getProperty("AEGIS_INTEL_LAST_SUCCESS") || null,
    notification_count: getServerNotifications(false).length,
    trigger_status: getInstalledAegisTriggers(),
    time: new Date().toISOString()
  };
}

function validateHorizonBriefing(text) {
  var required = [
    "header", "weather", "health", "sentinel", "calendar",
    "tasks", "gmail", "things to consider", "personal newspaper"
  ];
  var lower = String(text || "").toLowerCase();
  if (lower.length < 1200) throw new Error("HORIZON validation failed: briefing was unexpectedly short.");
  var missing = required.filter(function(k) { return lower.indexOf(k) === -1; });
  if (missing.length) throw new Error("HORIZON validation failed; missing expected sections: " + missing.join(", "));
  var h2 = String(text || "").match(/^##\s+/gm) || [];
  if (h2.length < 8) throw new Error("HORIZON validation failed: fewer than 8 top-level Markdown sections.");
  return true;
}

function runHorizonPipeline() {
  var props = PropertiesService.getScriptProperties();
  var mode = props.getProperty("AEGIS_HORIZON_RUN_MODE") || "manual";
  var started = new Date().toISOString();
  props.setProperty("AEGIS_HORIZON_LAST_ATTEMPT", started);
  props.setProperty("AEGIS_HORIZON_LAST_MODE", mode);
  try {
    var result = runHorizonPipelineUnsafe();
    props.setProperty("AEGIS_HORIZON_LAST_SUCCESS", new Date().toISOString());
    props.deleteProperty("AEGIS_HORIZON_LAST_ERROR");
    return result;
  } catch (err) {
    props.setProperty("AEGIS_HORIZON_LAST_ERROR", String(err.message || err));
    addServerNotification(
      "HORIZON generation failed",
      "The prior valid HORIZON briefing was preserved.",
      "critical",
      "horizon-generation",
      String(err.message || err),
      "horizon-failure-" + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd-HH")
    );
    throw err;
  } finally {
    props.deleteProperty("AEGIS_HORIZON_RUN_MODE");
  }
}

function getHorizonGenerationStatus() {
  var p = PropertiesService.getScriptProperties();
  return {
    last_attempt: p.getProperty("AEGIS_HORIZON_LAST_ATTEMPT") || null,
    last_success: p.getProperty("AEGIS_HORIZON_LAST_SUCCESS") || null,
    last_error: p.getProperty("AEGIS_HORIZON_LAST_ERROR") || null,
    mode: p.getProperty("AEGIS_HORIZON_LAST_MODE") || null
  };
}

function readNotificationStore() {
  var raw = PropertiesService.getScriptProperties().getProperty("AEGIS_NOTIFICATIONS");
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { return []; }
}

function writeNotificationStore(items) {
  items = (items || []).slice(0, 35);
  var raw = JSON.stringify(items);
  while (raw.length > 8500 && items.length > 5) {
    items.pop();
    raw = JSON.stringify(items);
  }
  PropertiesService.getScriptProperties().setProperty("AEGIS_NOTIFICATIONS", raw);
}

function addServerNotification(title, message, severity, type, detail, dedupeKey) {
  var items = readNotificationStore();
  var key = dedupeKey || [type, title, message].join("|");
  var existing = items.some(function(n) { return !n.acknowledged && n.key === key; });
  if (existing) return null;
  var item = {
    id: Utilities.getUuid(),
    key: key,
    title: title,
    message: message,
    severity: severity || "warning",
    type: type || "system",
    detail: detail || "",
    createdAt: new Date().toISOString(),
    acknowledged: false
  };
  items.unshift(item);
  writeNotificationStore(items);
  return item;
}

function getServerNotifications(includeAcknowledged) {
  return readNotificationStore().filter(function(n) {
    return includeAcknowledged || !n.acknowledged;
  });
}

function ackServerNotification(id) {
  var items = readNotificationStore();
  var found = false;
  items.forEach(function(n) {
    if (n.id === id) { n.acknowledged = true; n.acknowledgedAt = new Date().toISOString(); found = true; }
  });
  writeNotificationStore(items);
  return { status: found ? "success" : "not_found", notificationId: id };
}

function ensureAppointmentReminders() {
  try {
    var now = new Date();
    var horizon = new Date(now.getTime() + 75 * 60 * 1000);
    var events = CalendarApp.getDefaultCalendar().getEvents(now, horizon);
    events.forEach(function(ev) {
      if (ev.isAllDayEvent()) return;
      var mins = Math.round((ev.getStartTime().getTime() - now.getTime()) / 60000);
      if (mins < 0) return;
      var threshold = mins <= 15 ? 15 : (mins <= 60 ? 60 : null);
      if (!threshold) return;
      var key = "appointment:" + ev.getId() + ":" + threshold + ":" +
        Utilities.formatDate(ev.getStartTime(), CONFIG.TIMEZONE, "yyyyMMddHHmm");
      addServerNotification(
        "Appointment reminder",
        ev.getTitle() + " begins in about " + mins + " minute" + (mins === 1 ? "" : "s") + ".",
        mins <= 15 ? "critical" : "warning",
        "calendar-reminder",
        Utilities.formatDate(ev.getStartTime(), CONFIG.TIMEZONE, "EEEE, MMM d • h:mm a z"),
        key
      );
    });
  } catch (err) {
    Logger.log("Appointment reminder sweep failed: " + err.message);
  }
}

function resolveCalendarEventText(text) {
  text = String(text || "").trim();
  if (!text) throw new Error("No calendar event text supplied.");
  var now = new Date();
  var prompt =
    "You convert natural language into one calendar event. Current local datetime is " +
    Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX") +
    " in timezone " + CONFIG.TIMEZONE + ".\n" +
    "Resolve this request: " + text + "\n\n" +
    "Return ONLY JSON with keys title,start,end,location,description. " +
    "start and end must be ISO-8601 with timezone offset. If duration is not stated, use 60 minutes. " +
    "Do not invent a location unless the user supplied one.";
  var raw = callGemini(prompt).replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  var obj = JSON.parse(raw);
  if (!obj.title || !obj.start || !obj.end) throw new Error("Gemini did not resolve a complete event.");
  var start = new Date(obj.start), end = new Date(obj.end);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) throw new Error("Resolved event contained invalid dates.");
  return {
    title: String(obj.title),
    start: start.toISOString(),
    end: end.toISOString(),
    location: String(obj.location || ""),
    description: String(obj.description || "")
  };
}

function createCalendarEventFromResolved(eventObj) {
  if (!eventObj || !eventObj.title || !eventObj.start || !eventObj.end) {
    throw new Error("Incomplete resolved event.");
  }
  var start = new Date(eventObj.start), end = new Date(eventObj.end);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) throw new Error("Invalid event time range.");
  var event = CalendarApp.getDefaultCalendar().createEvent(
    String(eventObj.title),
    start,
    end,
    {
      location: String(eventObj.location || ""),
      description: String(eventObj.description || "")
    }
  );
  return {
    status: "success",
    event: {
      id: event.getId(),
      title: event.getTitle(),
      start: event.getStartTime().toISOString(),
      end: event.getEndTime().toISOString()
    }
  };
}

function combineFinanceDateTime(dateCell, timeCell) {
  var d = dateCell instanceof Date ? new Date(dateCell) : new Date(String(dateCell));
  if (isNaN(d.getTime())) return null;
  var h = 12, m = 0, s = 0;
  if (timeCell instanceof Date) {
    h = timeCell.getHours(); m = timeCell.getMinutes(); s = timeCell.getSeconds();
  } else {
    var t = String(timeCell || "").trim();
    if (t && !/^n\/?a$/i.test(t)) {
      var match = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
      if (match) {
        h = Number(match[1]); m = Number(match[2]); s = Number(match[3] || 0);
        var ap = String(match[4] || "").toUpperCase();
        if (ap === "PM" && h < 12) h += 12;
        if (ap === "AM" && h === 12) h = 0;
      }
    }
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, s);
}

function getRecentFinanceActivity(hours) {
  hours = Number(hours) || 72;
  var ss = SpreadsheetApp.openById(CONFIG.FINANCE_SHEET_ID);
  var sheet = ss.getSheetByName("Log") || ss.getSheets()[0];
  var values = sheet.getDataRange().getValues();
  if (!values.length) return { status: "success", updated: new Date().toISOString(), hours: hours, transactions: [], summary: {} };
  var headers = values[0].map(function(h) { return String(h).trim().toLowerCase(); });
  function col(name, fallback) {
    var i = headers.indexOf(name);
    return i >= 0 ? i : fallback;
  }
  var cDate = col("date", 0), cTime = col("timestamp", 1), cVendor = col("vendor / description", 2),
      cAmount = col("amount ($)", 3), cCategory = col("category", 4),
      cSource = col("payment method / source", 5), cNotes = col("notes", 6);
  var cutoff = Date.now() - hours * 60 * 60 * 1000;
  var tx = [];
  values.slice(1).forEach(function(row, idx) {
    var when = combineFinanceDateTime(row[cDate], row[cTime]);
    if (!when || when.getTime() < cutoff || when.getTime() > Date.now() + 5 * 60 * 1000) return;
    tx.push({
      row: idx + 2,
      occurredAt: when.toISOString(),
      vendor: String(row[cVendor] || "Unknown"),
      amount: Number(row[cAmount]) || 0,
      category: String(row[cCategory] || ""),
      paymentSource: String(row[cSource] || ""),
      notes: String(row[cNotes] || "")
    });
  });
  tx.sort(function(a,b) { return new Date(b.occurredAt) - new Date(a.occurredAt); });
  var purchaseTotal = 0, creditTotal = 0, transferTotal = 0, pendingCount = 0;
  tx.forEach(function(t) {
    var transfer = /^transfers?\b/i.test(t.category);
    if (t.amount < 0) creditTotal += t.amount;
    else if (transfer) transferTotal += t.amount;
    else if (t.amount > 0) purchaseTotal += t.amount;
    else pendingCount++;
  });
  return {
    status: "success",
    updated: new Date().toISOString(),
    hours: hours,
    transactions: tx,
    summary: {
      purchaseTotal: Math.round(purchaseTotal * 100) / 100,
      creditTotal: Math.round(creditTotal * 100) / 100,
      transferTotal: Math.round(transferTotal * 100) / 100,
      pendingCount: pendingCount,
      activityCount: tx.length
    }
  };
}

function getIntelligenceCacheFile() {
  var name = "aegis_intelligence_cache.json";
  var files = DriveApp.getFilesByName(name);
  return files.hasNext() ? files.next() : null;
}

function readPersistentIntelligenceCache() {
  try {
    var f = getIntelligenceCacheFile();
    if (!f) return null;
    return JSON.parse(f.getBlob().getDataAsString());
  } catch (e) { return null; }
}

function writePersistentIntelligenceCache(obj) {
  var text = JSON.stringify(obj);
  var f = getIntelligenceCacheFile();
  if (f) f.setContent(text);
  else DriveApp.createFile("aegis_intelligence_cache.json", text, MimeType.PLAIN_TEXT);
}

function parseRssResponse(source, response) {
  var code = response.getResponseCode();
  if (code < 200 || code >= 300) throw new Error("HTTP " + code);
  var xml = response.getContentText();
  var root = XmlService.parse(xml).getRootElement();
  var entries = [];
  if (root.getName().toLowerCase() === "rss" || root.getChild("channel")) {
    var channel = root.getChild("channel") || root;
    entries = channel.getChildren("item").slice(0, 12).map(function(item) {
      return rssItemFromElement(item, source, false);
    });
  } else {
    var ns = root.getNamespace();
    entries = root.getChildren("entry", ns).slice(0, 12).map(function(entry) {
      return rssItemFromElement(entry, source, true, ns);
    });
  }
  return entries.filter(function(x) { return x.title && x.link; });
}

function getIntelligenceFeedV24(forceRefresh) {
  var old = readPersistentIntelligenceCache();
  if (!forceRefresh && old && old.updated) {
    var age = Date.now() - new Date(old.updated).getTime();
    if (age < 20 * 60 * 1000) {
      old.status = old.source_errors && old.source_errors.length ? "partial" : "ready";
      old.cache = "persistent";
      return old;
    }
  }

  var sources = getAegisRssSources();
  var requests = sources.map(function(s) {
    return {
      url: s.url,
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { "User-Agent": "AEGIS-Dashboard/2.4 (+Google Apps Script)" }
    };
  });

  var responses;
  try {
    responses = UrlFetchApp.fetchAll(requests);
  } catch (fatal) {
    if (old) {
      old.status = "cached";
      old.cache_error = fatal.message;
      return old;
    }
    throw fatal;
  }

  var all = [], errors = [], health = [];
  responses.forEach(function(resp, i) {
    var source = sources[i];
    try {
      var items = parseRssResponse(source, resp);
      items.forEach(function(item) { all.push(item); });
      health.push({ source: source.name, status: "ready", items: items.length, http: resp.getResponseCode() });
    } catch (err) {
      errors.push({ source: source.name, error: err.message });
      health.push({ source: source.name, status: "failed", items: 0, error: err.message, http: resp.getResponseCode() });
    }
  });

  all.sort(function(a,b) {
    var ad = a.published ? new Date(a.published).getTime() : 0;
    var bd = b.published ? new Date(b.published).getTime() : 0;
    return bd !== ad ? bd - ad : (b.priority || 0) - (a.priority || 0);
  });

  var seen = {};
  all = all.filter(function(item) {
    var key = normalizeIntelTitle(item.title);
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  }).slice(0, 140);

  var categories = {};
  all.forEach(function(item) {
    categories[item.category] = categories[item.category] || [];
    if (categories[item.category].length < 24) categories[item.category].push(item);
  });

  var result = {
    status: errors.length ? (all.length ? "partial" : "failed") : "ready",
    updated: new Date().toISOString(),
    items: all,
    categories: categories,
    source_count: sources.length,
    source_errors: errors,
    source_health: health
  };

  if (all.length) {
    writePersistentIntelligenceCache(result);
    PropertiesService.getScriptProperties().setProperty("AEGIS_INTEL_LAST_SUCCESS", result.updated);
  } else if (old) {
    old.status = "cached";
    old.source_errors = errors;
    old.source_health = health;
    return old;
  }
  return result;
}

function scheduledHorizonRun() {
  var props = PropertiesService.getScriptProperties();
  var today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd");
  if (props.getProperty("AEGIS_HORIZON_AUTO_DATE") === today) return;
  props.setProperty("AEGIS_HORIZON_RUN_MODE", "automatic");
  try {
    runHorizonPipeline();
    refreshHorizonDataFeed();
    props.setProperty("AEGIS_HORIZON_AUTO_DATE", today);
  } catch (err) {
    Logger.log("Scheduled HORIZON failed: " + err.message);
  }
}

function scheduledIntelligenceRefresh() {
  try { getIntelligenceFeedV24(true); }
  catch (err) {
    addServerNotification("Intelligence refresh failed", "Scheduled RSS refresh failed.", "warning", "intelligence", err.message,
      "intel-scheduled-" + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyyMMddHH"));
  }
}

function scheduledNotificationSweep() {
  ensureAppointmentReminders();
}

function installAegisAutomationTriggers() {
  var names = ["scheduledHorizonRun", "scheduledIntelligenceRefresh", "scheduledNotificationSweep"];
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (names.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("scheduledHorizonRun").timeBased().atHour(6).everyDays(1).create();
  ScriptApp.newTrigger("scheduledIntelligenceRefresh").timeBased().everyHours(1).create();
  ScriptApp.newTrigger("scheduledNotificationSweep").timeBased().everyMinutes(15).create();
  return getInstalledAegisTriggers();
}

function getInstalledAegisTriggers() {
  return ScriptApp.getProjectTriggers().map(function(t) {
    return { handler: t.getHandlerFunction(), source: String(t.getEventType()) };
  });
}
