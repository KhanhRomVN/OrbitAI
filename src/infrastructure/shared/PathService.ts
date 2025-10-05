// src/infrastructure/shared/PathService.ts
import * as path from "path";
import { IPathService } from "../../domain/collection/services/TreeService";

export class NodePathService implements IPathService {
  normalize(p: string): string {
    return path.normalize(p).replace(/\\/g, "/");
  }

  join(...paths: string[]): string {
    return path.join(...paths).replace(/\\/g, "/");
  }

  dirname(p: string): string {
    return path.dirname(p);
  }

  basename(p: string): string {
    return path.basename(p);
  }

  extname(p: string): string {
    return path.extname(p);
  }

  relative(from: string, to: string): string {
    return path.relative(from, to).replace(/\\/g, "/");
  }

  isAbsolute(p: string): boolean {
    return path.isAbsolute(p);
  }
}
