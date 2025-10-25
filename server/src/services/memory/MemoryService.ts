/**
 * Memory Service
 * Implements file-based memory storage for agent persistence
 * Supports Anthropic's memory_20250818 tool commands
 * Implements MemoryToolHandlers interface for integration with Anthropic SDK
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../../utils/logger';
import type {
  MemoryToolHandlers,
  BetaMemoryTool20250818ViewCommand,
  BetaMemoryTool20250818CreateCommand,
  BetaMemoryTool20250818StrReplaceCommand,
  BetaMemoryTool20250818InsertCommand,
  BetaMemoryTool20250818DeleteCommand,
  BetaMemoryTool20250818RenameCommand,
} from '@anthropic-ai/sdk/helpers/beta/memory';

const logger = new Logger('MemoryService');

// Security constants
const MEMORY_BASE_DIR = path.join(process.cwd(), 'memory');
const MAX_FILE_SIZE = 1024 * 1024; // 1MB per file
const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB per tenant

export class MemoryService implements MemoryToolHandlers {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Create a new MemoryService instance for a tenant
   */
  static async init(tenantId: string): Promise<MemoryService> {
    const service = new MemoryService(tenantId);
    await service.ensureTenantDir();
    return service;
  }

  /**
   * Get the full path for a tenant's memory directory
   */
  private getTenantMemoryDir(): string {
    return path.join(MEMORY_BASE_DIR, this.tenantId);
  }

  /**
   * Validate and resolve memory path
   * Ensures path stays within tenant's memory directory and prevents traversal attacks
   */
  private async validatePath(memoryPath: string): Promise<string> {
    // Remove leading slash if present
    const sanitizedPath = memoryPath.startsWith('/') ? memoryPath.slice(1) : memoryPath;

    // Resolve to absolute path
    const tenantDir = this.getTenantMemoryDir();
    const fullPath = path.resolve(tenantDir, sanitizedPath);

    // Ensure path is within tenant directory (prevent path traversal)
    if (!fullPath.startsWith(tenantDir)) {
      throw new Error(`Invalid path: ${memoryPath} - path traversal detected`);
    }

    // Check for dangerous patterns
    if (sanitizedPath.includes('..') || sanitizedPath.includes('%2e%2e')) {
      throw new Error(`Invalid path: ${memoryPath} - contains traversal patterns`);
    }

    return fullPath;
  }

  /**
   * Ensure tenant memory directory exists
   */
  private async ensureTenantDir(): Promise<void> {
    const tenantDir = this.getTenantMemoryDir();
    await fs.mkdir(tenantDir, { recursive: true });
  }

  /**
   * Get total size of tenant's memory files
   */
  private async getTenantMemorySize(): Promise<number> {
    const tenantDir = this.getTenantMemoryDir();

    try {
      const files = await this.listAllFiles(tenantDir);
      let totalSize = 0;

      for (const file of files) {
        const stats = await fs.stat(file);
        totalSize += stats.size;
      }

      return totalSize;
    } catch (error) {
      logger.error('Error calculating memory size:', error);
      return 0;
    }
  }

  /**
   * Recursively list all files in a directory
   */
  private async listAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...await this.listAllFiles(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist yet
    }

    return files;
  }

  /**
   * View command: Show directory contents or file contents
   * Implements MemoryToolHandlers.view
   */
  async view(command: BetaMemoryTool20250818ViewCommand): Promise<string> {
    const memoryPath = command.path || '/';
    const fullPath = await this.validatePath(memoryPath);

    logger.info('Memory view command', { tenantId: this.tenantId, path: memoryPath });

    try {
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        // List directory contents
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        const listing = entries.map(e => {
          const type = e.isDirectory() ? 'd' : 'f';
          return `${type} ${e.name}`;
        }).join('\n');

        return listing || '[Empty directory]';
      } else {
        // Read file contents
        const content = await fs.readFile(fullPath, 'utf-8');

        if (command.view_range) {
          const lines = content.split('\n');
          const start = Math.max(0, command.view_range.start_line - 1);
          const end = Math.min(lines.length, command.view_range.end_line);
          return lines.slice(start, end).join('\n');
        }

        return content;
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return '[Not found]';
      }
      throw error;
    }
  }

  /**
   * Create command: Write new file or overwrite existing
   * Implements MemoryToolHandlers.create
   */
  async create(command: BetaMemoryTool20250818CreateCommand): Promise<string> {
    const { path: memoryPath, file_text: fileText } = command;
    const fullPath = await this.validatePath(memoryPath);

    logger.info('Memory create command', { tenantId: this.tenantId, path: memoryPath });

    // Check file size
    if (Buffer.byteLength(fileText, 'utf-8') > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE} bytes`);
    }

    // Check total tenant memory size
    const currentSize = await this.getTenantMemorySize(tenantId);
    if (currentSize + Buffer.byteLength(fileText, 'utf-8') > MAX_TOTAL_SIZE) {
      throw new Error(`Tenant memory limit exceeded. Maximum total size is ${MAX_TOTAL_SIZE} bytes`);
    }

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Write file
    await fs.writeFile(fullPath, fileText, 'utf-8');

    logger.info(`Created memory file: ${memoryPath}`, { tenantId: this.tenantId, size: fileText.length });
    return `Created: ${memoryPath}`;
  }

  /**
   * str_replace command: Replace text in file
   * Implements MemoryToolHandlers.str_replace
   */
  async str_replace(command: BetaMemoryTool20250818StrReplaceCommand): Promise<string> {
    const { path: memoryPath, old_str: oldStr, new_str: newStr } = command;
    const fullPath = await this.validatePath(memoryPath);

    logger.info('Memory str_replace command', { tenantId: this.tenantId, path: memoryPath });

    // Read current content
    const content = await fs.readFile(fullPath, 'utf-8');

    // Replace text
    const newContent = content.replace(oldStr, newStr);

    if (newContent === content) {
      throw new Error(`String not found in file: ${oldStr}`);
    }

    // Write back
    await fs.writeFile(fullPath, newContent, 'utf-8');

    logger.info(`Replaced text in memory file: ${memoryPath}`, { tenantId: this.tenantId });
    return `Updated: ${memoryPath}`;
  }

  /**
   * Insert command: Insert text at specific line
   * Implements MemoryToolHandlers.insert
   */
  async insert(command: BetaMemoryTool20250818InsertCommand): Promise<string> {
    const { path: memoryPath, insert_line: insertLine, insert_text: insertText } = command;
    const fullPath = await this.validatePath(memoryPath);

    logger.info('Memory insert command', { tenantId: this.tenantId, path: memoryPath, line: insertLine });

    // Read current content
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');

    // Insert text at line
    if (insertLine < 1 || insertLine > lines.length + 1) {
      throw new Error(`Invalid line number: ${insertLine}. File has ${lines.length} lines`);
    }

    lines.splice(insertLine - 1, 0, insertText);

    // Write back
    const newContent = lines.join('\n');
    await fs.writeFile(fullPath, newContent, 'utf-8');

    logger.info(`Inserted text in memory file: ${memoryPath}`, { tenantId: this.tenantId, line: insertLine });
    return `Inserted at line ${insertLine}: ${memoryPath}`;
  }

  /**
   * Delete command: Remove file or directory
   * Implements MemoryToolHandlers.delete
   */
  async delete(command: BetaMemoryTool20250818DeleteCommand): Promise<string> {
    const { path: memoryPath } = command;
    const fullPath = await this.validatePath(memoryPath);

    logger.info('Memory delete command', { tenantId: this.tenantId, path: memoryPath });

    try {
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true });
      } else {
        await fs.unlink(fullPath);
      }

      logger.info(`Deleted memory file/directory: ${memoryPath}`, { tenantId: this.tenantId });
      return `Deleted: ${memoryPath}`;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Not found: ${memoryPath}`);
      }
      throw error;
    }
  }

  /**
   * Rename command: Move or rename file/directory
   * Implements MemoryToolHandlers.rename
   */
  async rename(command: BetaMemoryTool20250818RenameCommand): Promise<string> {
    const { old_path: oldPath, new_path: newPath } = command;
    const fullOldPath = await this.validatePath(oldPath);
    const fullNewPath = await this.validatePath(newPath);

    logger.info('Memory rename command', { tenantId: this.tenantId, oldPath, newPath });

    // Ensure parent directory of new path exists
    await fs.mkdir(path.dirname(fullNewPath), { recursive: true });

    // Rename/move
    await fs.rename(fullOldPath, fullNewPath);

    logger.info(`Renamed memory file: ${oldPath} -> ${newPath}`, { tenantId: this.tenantId });
    return `Renamed: ${oldPath} -> ${newPath}`;
  }
}
