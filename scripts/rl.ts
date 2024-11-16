/* eslint-disable no-console */
import "dotenv/config";

let successCount = 0;
let errorCount = 0;
let rateLimitedCount = 0;
let totalRequests = 0;
let startTime = Date.now();

const rateLimitInfo = {
  limit: 0,
  current: 0,
  remaining: 0,
  reset: 0,
};

const sendRequest = async () => {
  const raw = JSON.stringify({
    level: "warn",
    message: "hello",
    type: "text",
  });

  try {
    const response = await fetch(
      "http://localhost:3000/api/log/cm3jkbc6s00083wcqf4xzybql",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: raw,
      },
    );

    // Extract rate limit headers
    rateLimitInfo.current =
      response.headers.get("x-ratelimit-current") || rateLimitInfo.remaining;
    rateLimitInfo.limit =
      response.headers.get("x-ratelimit-limit") || rateLimitInfo.limit;
    rateLimitInfo.remaining = rateLimitInfo.limit - rateLimitInfo.current;
    rateLimitInfo.reset =
      response.headers.get("x-ratelimit-reset") || rateLimitInfo.reset;

    if (response.status === 429) {
      rateLimitedCount++;
      return "rate-limited";
    } else if (response.ok) {
      successCount++;
      return "success";
    } else {
      errorCount++;
      return "error";
    }
  } catch (err) {
    console.error(err);
    errorCount++;
    return "error";
  }
};

const main = () => {
  const interval = 1000; // Interval between requests in ms
  const num = 9; // Number of concurrent requests per batch

  const intervalId = setInterval(() => {
    const promises = [];
    for (let i = 0; i < num; i++) {
      promises.push(sendRequest());
    }

    Promise.all(promises).then(() => {
      totalRequests += num;

      const elapsedTime = (Date.now() - startTime) / 1000;
      const rps = (totalRequests / elapsedTime).toFixed(2);

      console.clear();
      console.log(`Elapsed Time: ${elapsedTime.toFixed(2)} seconds`);
      console.log(`Total Requests: ${totalRequests}`);
      console.log(`Success: ${successCount}`);
      console.log(`Errors: ${errorCount}`);
      console.log(`Rate-Limited: ${rateLimitedCount}`);
      console.log(`Requests per Second: ${rps}`);
      console.log("Rate Limit Info:");
      console.log(`  Current: ${rateLimitInfo.current || "N/A"}`);
      console.log(`  Remaining: ${rateLimitInfo.remaining || "N/A"}`);
      console.log(`  Limit: ${rateLimitInfo.limit || "N/A"}`);
      console.log(`  Reset: ${rateLimitInfo.reset || "N/A"}`);
    });
  }, interval);

  // Graceful shutdown on Ctrl+C
  process.on("SIGINT", () => {
    clearInterval(intervalId);
    console.log("\nStopped the test.");
    process.exit(0);
  });
};

main();
