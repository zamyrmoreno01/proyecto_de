const express = require("express");
const { randomUUID } = require("crypto");
const { query } = require("../db/neon");
const { requireAdmin } = require("../middleware/auth");
const { upload, removeStoredFile } = require("../lib/files");

const router = express.Router();

router.post("/", requireAdmin, upload.single("mediaFiles"), async (req, res, next) => {
  const uploadedFile = req.file;

  try {
    const personId = String(req.body?.personId || "").trim();
    const eventName = String(req.body?.eventName || "").trim();
    const eventDate = String(req.body?.eventDate || "").trim();
    const description = String(req.body?.description || "").trim();

    if (!personId || !eventName || !eventDate || !description || !uploadedFile) {
      if (uploadedFile) {
        await removeStoredFile(`/uploads/media/${uploadedFile.filename}`);
      }

      res.status(400).json({ message: "personId, eventName, eventDate, description and mediaFiles are required." });
      return;
    }

    const person = await query("SELECT id FROM persons WHERE id = $1", [personId]);
    if (!person.rowCount) {
      await removeStoredFile(`/uploads/media/${uploadedFile.filename}`);
      res.status(404).json({ message: "The person ID does not exist." });
      return;
    }

    const mediaId = randomUUID();
    const fileUrl = `/uploads/media/${uploadedFile.filename}`;

    const inserted = await query(
      `
        INSERT INTO media (
          id,
          person_id,
          original_name,
          stored_name,
          file_url,
          mime_type,
          event_name,
          event_date,
          description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING
          id,
          person_id AS "personId",
          original_name AS "originalName",
          stored_name AS "storedName",
          file_url AS "fileUrl",
          mime_type AS "type",
          event_name AS "eventName",
          TO_CHAR(event_date, 'YYYY-MM-DD') AS "eventDate",
          description,
          created_at AS "createdAt";
      `,
      [
        mediaId,
        personId,
        uploadedFile.originalname,
        uploadedFile.filename,
        fileUrl,
        uploadedFile.mimetype,
        eventName,
        eventDate,
        description
      ]
    );

    res.status(201).json({ media: inserted.rows[0] });
  } catch (error) {
    if (uploadedFile) {
      try {
        await removeStoredFile(`/uploads/media/${uploadedFile.filename}`);
      } catch {}
    }

    next(error);
  }
});

router.patch("/:mediaId", requireAdmin, async (req, res, next) => {
  try {
    const mediaId = String(req.params.mediaId || "").trim();
    const eventName = String(req.body?.eventName || "").trim();
    const eventDate = String(req.body?.eventDate || "").trim();
    const description = String(req.body?.description || "").trim();

    if (!mediaId || !eventName || !eventDate || !description) {
      res.status(400).json({ message: "eventName, eventDate and description are required." });
      return;
    }

    const updated = await query(
      `
        UPDATE media
        SET
          event_name = $2,
          event_date = $3,
          description = $4
        WHERE id = $1
        RETURNING
          id,
          person_id AS "personId",
          original_name AS "originalName",
          stored_name AS "storedName",
          file_url AS "fileUrl",
          mime_type AS "type",
          event_name AS "eventName",
          TO_CHAR(event_date, 'YYYY-MM-DD') AS "eventDate",
          description,
          created_at AS "createdAt";
      `,
      [mediaId, eventName, eventDate, description]
    );

    if (!updated.rowCount) {
      res.status(404).json({ message: "Media not found." });
      return;
    }

    res.json({ media: updated.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete("/:mediaId", requireAdmin, async (req, res, next) => {
  try {
    const mediaId = String(req.params.mediaId || "").trim();

    const deleted = await query(
      `
        DELETE FROM media
        WHERE id = $1
        RETURNING file_url AS "fileUrl";
      `,
      [mediaId]
    );

    if (!deleted.rowCount) {
      res.status(404).json({ message: "Media not found." });
      return;
    }

    await removeStoredFile(deleted.rows[0].fileUrl);

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
