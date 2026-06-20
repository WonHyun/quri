import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CopilotAgent,
  GenerateQuizParams,
  GeneratedQuiz,
} from "@quri/agent";

@Injectable()
export class AgentService {
  private readonly agent: CopilotAgent;

  constructor(config: ConfigService) {
    // 타임아웃 등 미지정 옵션은 CopilotAgent 가 env/기본값으로 처리하므로
    // 여기서 중복 파싱하지 않고 설정값만 그대로 전달한다.
    const timeout = config.get<string>("COPILOT_TIMEOUT_MS");
    const batchSize = config.get<string>("COPILOT_BATCH_SIZE");
    const concurrency = config.get<string>("COPILOT_CONCURRENCY");
    this.agent = new CopilotAgent({
      bin: config.get<string>("COPILOT_BIN"),
      model: config.get<string>("COPILOT_MODEL"),
      timeoutMs: timeout ? Number(timeout) : undefined,
      batchSize: batchSize ? Number(batchSize) : undefined,
      concurrency: concurrency ? Number(concurrency) : undefined,
    });
  }

  generateQuiz(params: GenerateQuizParams): Promise<GeneratedQuiz> {
    return this.agent.generateQuiz(params);
  }
}
