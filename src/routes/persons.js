const express = require("express");
const { query } = require("../db/neon");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const includeMedia = req.query.includeMedia === "true";
    const params = [];
    let whereClause = "";

    if (search) {
      params.push(`%${search}%`);
      whereClause = `
        WHERE p.id ILIKE $1
           OR p.name ILIKE $1
      `;
    }

    if (!includeMedia) {
      const people = await query(
        `
          SELECT p.id, p.name, p.created_at
          FROM persons p
          ${whereClause}
          ORDER BY p.id ASC;
        `,
        params
      );

      res.json({ persons: people.rows });
      return;
    }

    const people = await query(
      `
        SELECT
          p.id,
          p.name,
          p.created_at,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', m.id,
                'originalName', m.original_name,
                'storedName', m.stored_name,
                'fileUrl', m.file_url,
                'type', m.mime_type,
                'eventName', m.event_name,
                'eventDate', TO_CHAR(m.event_date, 'YYYY-MM-DD'),
                'description', m.description,
                'createdAt', m.created_at
              )
              ORDER BY m.created_at DESC
            ) FILTER (WHERE m.id IS NOT NULL),
            '[]'::json
          ) AS media
        FROM persons p
        LEFT JOIN media m ON m.person_id = p.id
        ${whereClause}
        GROUP BY p.id, p.name, p.created_at
        ORDER BY p.id ASC;
      `,
      params
    );

    res.json({ persons: people.rows });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAdmin, async (req, res, next) => {
  try {
    const personId = String(req.body?.id || "").trim();
    const personName = String(req.body?.name || "").trim();

    if (!/^\d+$/.test(personId)) {
      res.status(400).json({ message: "The ID must be numeric." });
      return;
    }

    if (!personName) {
      res.status(400).json({ message: "The name is required." });
      return;
    }

    const existing = await query("SELECT 1 FROM persons WHERE id = $1", [personId]);
    if (existing.rowCount) {
      res.status(409).json({ message: "That ID already exists." });
      return;
    }

    const inserted = await query(
      `
        INSERT INTO persons (id, name)
        VALUES ($1, $2)
        RETURNING id, name, created_at;
      `,
      [personId, personName]
    );

    res.status(201).json({ person: inserted.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete("/:personId", requireAdmin, async (req, res, next) => {
  try {
    const personId = String(req.params.personId || "").trim();

    if (!personId) {
      res.status(400).json({ message: "Person ID is required." });
      return;
    }

    const deleted = await query(
      "DELETE FROM persons WHERE id = $1 RETURNING id;",
      [personId]
    );

    if (!deleted.rowCount) {
      res.status(404).json({ message: "Person not found." });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/:personId/media", async (req, res, next) => {
  try {
    const personId = String(req.params.personId || "").trim();

    if (!personId) {
      res.status(400).json({ message: "Person ID is required." });
      return;
    }

    const personResult = await query(
      "SELECT id, name, created_at FROM persons WHERE id = $1",
      [personId]
    );

    const person = personResult.rows[0];
    if (!person) {
      res.status(404).json({ message: "Person not found." });
      return;
    }

    const mediaResult = await query(
      `
        SELECT
          id,
          original_name AS "originalName",
          stored_name AS "storedName",
          file_url AS "fileUrl",
          mime_type AS "type",
          event_name AS "eventName",
          TO_CHAR(event_date, 'YYYY-MM-DD') AS "eventDate",
          description,
          created_at AS "createdAt"
        FROM media
        WHERE person_id = $1
        ORDER BY created_at DESC;
      `,
      [personId]
    );

    res.json({
      person: {
        id: person.id,
        name: person.name,
        createdAt: person.created_at
      },
      media: mediaResult.rows
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
