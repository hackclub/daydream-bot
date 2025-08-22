import { App } from "@slack/bolt";
import cron from "node-cron";

const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
});

async function sendLeaderboard() {
	await app.client.chat.postMessage({
		channel: process.env.CHANNEL_ID as string,
		text: "Daydream LB",
	});
}

// schedule for 9 AM daily
cron.schedule("0 9 * * *", sendLeaderboard);

app.start();
console.log("Daydream bot running");

sendLeaderboard();
