/*
 * AEGIS AQ-1 — Authenticated AI Query Gateway
 *
 * Runtime integration requirements in Code.gs:
 * 1. Add `ai.query` to the default AUTH-1 scope list.
 * 2. In aegisScopeForAction_(action, message):
 *      if (action === "ai_query") return "ai.query";
 * 3. In doPost(e), after AUTH-1 authorization and protected reads:
 *      if (action === "ai_query") return jsonOutput(handleAegisAiQueryV1_(contents));
 *
 * AQ-1 is READ ONLY. It never mutates Calendar, Tasks, Gmail, SPARK,
 * KINETIC, SENTINEL-FIN, HORIZON, Notes, or any canonical state store.
 */

function normalizeAegisAiModeV1_(mode) {
  var value = String(mode || "general").trim().toLowerCase();
  var allowed = ["general", "career", "finance", "logistics", "system"];
  return allowed.indexOf(value) >= 0 ? value : "general";
}

function clipAegisAiTextV1_(value, maxChars) {
  var text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  return text.length > maxChars ? text.slice(0, maxChars) + "…" : text;
}

function sanitizeAegisAiHistoryV1_(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-8).map(function(item) {
    var role = String(item && item.role || "").toLowerCase();
    if (role !== "user" && role !== "assistant") role = "user";
    return {
      role: role,
      text: clipAegisAiTextV1_(item && item.text, 1800)
    };
  }).filter(function(item) { return !!item.text; });
}

function safeAegisAiSourceV1_(name, fn) {
  try {
    return { status: "AVAILABLE", source: name, data: fn() };
  } catch (err) {
    return { status: "UNAVAILABLE", source: name, error: err.message };
  }
}

function buildAegisAiContextV1_(mode) {
  var now = new Date();
  var tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  var context = {
    generated_at: now.toISOString(),
    timezone: CONFIG.TIMEZONE,
    mode: mode,
    mutation_policy: "READ_ONLY",
    evidence_policy: "Use only supplied bounded/current context. Do not invent missing personal facts."
  };

  if (mode === "general" || mode === "career" || mode === "logistics") {
    context.calendar = safeAegisAiSourceV1_("GOOGLE_CALENDAR", function() {
      return {
        today: serializeCalendarDayV25(now),
        tomorrow: serializeCalendarDayV25(tomorrow)
      };
    });
    context.tasks = safeAegisAiSourceV1_("GOOGLE_TASKS", function() {
      var state = getCurrentTasksV25();
      return {
        status: state.status,
        items: (state.items || []).slice(0, 20).map(function(t) {
          return { id: t.id, title: clipAegisAiTextV1_(t.title, 300), due: t.due || null };
        })
      };
    });
  }

  if (mode === "general" || mode === "career") {
    context.active_notes = safeAegisAiSourceV1_("ACTIVE_NOTE_FILTER", function() {
      var notes = getActiveNotesV25();
      return {
        filter: notes.filter,
        active_candidates: (notes.active_candidates || []).slice(-12).map(function(x) {
          return clipAegisAiTextV1_(x, 600);
        })
      };
    });
    context.spark = safeAegisAiSourceV1_("SPARK_TO_HORIZON_V2", function() {
      return buildSparkToHorizonV2();
    });
  }

  if (mode === "general") {
    context.kinetic = safeAegisAiSourceV1_("KINETIC_TO_HORIZON_V2", function() {
      return buildKineticToHorizonV2();
    });
  }

  if (mode === "finance") {
    context.sentinel_fin = safeAegisAiSourceV1_("SENTINEL_FIN_TO_HORIZON_V25", function() {
      return buildSentinelFinToHorizonV25();
    });
  }

  if (mode === "logistics") {
    context.gmail = safeAegisAiSourceV1_("GMAIL_METADATA_7D", function() {
      var gmail = getCurrentGmailContextV25();
      return {
        status: gmail.status,
        query: gmail.query,
        unread_only: gmail.unread_only,
        items: (gmail.items || []).slice(0, 12).map(function(x) {
          return {
            subject: clipAegisAiTextV1_(x.subject, 280),
            from: clipAegisAiTextV1_(x.from, 220),
            date: x.date,
            important: !!x.important,
            starred: !!x.starred
          };
        })
      };
    });
  }

  if (mode === "system") {
    context.capabilities = safeAegisAiSourceV1_("AEGIS_CAPABILITIES", function() {
      return getAegisCapabilities();
    });
    context.health = safeAegisAiSourceV1_("AEGIS_HEALTH", function() {
      return getAegisHealth();
    });
  }

  return context;
}

function getAegisAiModeInstructionV1_(mode) {
  if (mode === "career") {
    return "Act as a career advisor and technical-career mentor. Separate verified context, user-stated goals/preferences, inferences, and recommendations. Do not invent employment history, credentials, strengths, or goals that are absent from the supplied context.";
  }
  if (mode === "finance") {
    return "Act as a financial planning and analysis assistant using the bounded SENTINEL-FIN summary. Distinguish recorded financial facts from analysis and recommendations. Do not claim fiduciary status and do not execute transactions.";
  }
  if (mode === "logistics") {
    return "Act as an executive logistics assistant. Use only the supplied Calendar, Tasks, and Gmail metadata. Do not claim to have read email bodies when only metadata is provided.";
  }
  if (mode === "system") {
    return "Act as a technical operator for GEMINI-POS / AEGIS. Explain current system health and capabilities from the supplied system telemetry. Do not fabricate runtime state.";
  }
  return "Act as the authenticated GEMINI-POS assistant. Help the user reason across the supplied current Calendar, Tasks, active notes, SPARK bounded state, and KINETIC display state. Be clear when a requested fact is not present.";
}

function handleAegisAiQueryV1_(contents) {
  var question = clipAegisAiTextV1_(contents && contents.question, 4000);
  if (!question) {
    return {
      status: "error",
      code: "AI_QUERY_EMPTY",
      error: "A question is required."
    };
  }

  var mode = normalizeAegisAiModeV1_(contents && contents.mode);
  var history = sanitizeAegisAiHistoryV1_(contents && contents.history);
  var context = buildAegisAiContextV1_(mode);
  var cfg = getGeminiConfig();

  var transcript = history.length
    ? history.map(function(item) {
        return item.role.toUpperCase() + ": " + item.text;
      }).join("\n")
    : "(no prior messages in this browser session)";

  var prompt =
    "You are the AEGIS AQ-1 authenticated conversational gateway for GEMINI-POS.\n" +
    "This request is READ-ONLY. Never claim to have created, edited, deleted, sent, purchased, invested, scheduled, or mutated anything.\n" +
    "Do not use hidden memory or prior briefings as factual evidence. Use only the CURRENT_CONTEXT below plus the explicit short session transcript.\n" +
    "If the context does not support a personal fact, say that it is not available rather than guessing.\n" +
    "The transcript is short-term conversational continuity supplied by the browser; it is not durable canonical memory.\n\n" +
    "MODE: " + mode.toUpperCase() + "\n" +
    "MODE INSTRUCTION: " + getAegisAiModeInstructionV1_(mode) + "\n\n" +
    "CURRENT_CONTEXT:\n" + JSON.stringify(context) + "\n\n" +
    "SESSION_TRANSCRIPT:\n" + transcript + "\n\n" +
    "CURRENT_USER_QUESTION:\n" + question + "\n\n" +
    "Respond in clear conversational prose. Prefer actionable answers, but label uncertainty and recommendations appropriately.";

  var answer = callGemini(prompt);

  return {
    status: "success",
    contract: "AEGIS_AI_QUERY_V1",
    generated_at: new Date().toISOString(),
    request_id: Utilities.getUuid(),
    mode: mode,
    answer: answer,
    model: cfg.model,
    mutation_performed: false,
    memory: {
      type: "CLIENT_SESSION_ONLY",
      history_messages_used: history.length,
      durable_memory_written: false
    },
    context_sources: Object.keys(context).filter(function(key) {
      return context[key] && typeof context[key] === "object" && context[key].source;
    }).map(function(key) {
      return {
        key: key,
        source: context[key].source,
        status: context[key].status
      };
    })
  };
}
