import { query } from "@anthropic-ai/claude-agent-sdk";
import { SingletonFactory } from "../utils/Singleton";



export async function testSDK() {
    const results: string[] = []
    for await (const message of query({
        prompt: "What files are in this directory?",
        options: { allowedTools: ["Read", "Edit", "Bash"] }
    })) {
        if ("result" in message) {
            console.log(message.result)
            results.push(message.result)
        }
    }
    return results
}
