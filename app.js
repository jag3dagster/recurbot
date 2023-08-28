import "dotenv/config";
import express from "express";
import {
  InteractionType,
  InteractionResponseType
} from "discord-interactions";
import { VerifyDiscordRequest } from "./utils.js";
import {
  Client,
  GatewayIntentBits,
  GuildScheduledEventManager,
  CDN
} from "discord.js";

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

const token = process.env.DISCORD_TOKEN;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildScheduledEvents
  ],
});

client.login(token);

client.on("guildScheduledEventCreate", async (m) => {
  console.log("CRE");
  console.log(m);
});

client.on("guildScheduledEventUpdate", async (before, after) => {
  console.log("UP");
  console.log(before.name);
  console.log(after);

  //trigger on completing or cancelling, if the description includes "recur"
  if (before.description.toLowerCase().includes("recur")
    && before.status !== after.status
    && after.status >= 3
  ) {
    const guild = await client.guilds.fetch(before.guildId);
    const channel = await client.channels.fetch(before.channelId);

    // Grab the image from the previous event (before)
    const imageLink = null;
    if (before.image !== null) {
      const cdn = new CDN();
      imageLink = cdn.guildScheduledEventCover(before.id, before.image, {
        size: 4096,
      });
    }

    const endTime = before.scheduledEndTimestamp !== null
      ? before.scheduleEndTimestamp + 604800000
      : null;

    // Create new event using the information from the old event
    const event_manager = new GuildScheduledEventManager(guild);
    event_manager.create({
      name: before.name,
      description: before.description,
      // Schedule the new event a week later (in milliseconds)
      scheduledStartTime: before.scheduledStartTimestamp + 604800000,
      scheduledEndTime: endTime,
      channel: channel,
      privacyLevel: before.privacyLevel,
      entityType: before.entityType,
      entityMetadata: before.entityMetadata,
      image: imageLink,
    });
  }
});

client.on("guildScheduledEventDelete", async (m) => {
  console.log("DEL");
  console.log(m);
});

app.post("/interactions", async function (req, res) {
  // Interaction type and data
  const { type, id, data } = req.body;

  // Handle verification requests
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }
});

app.listen(PORT, () => {
  console.log("Listening on port", PORT);
});
