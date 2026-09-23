import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { SessionAuthGuard } from "../tenant/session-auth.guard.js";
import { AccountsController } from "./accounts.controller.js";
import { AccountsService } from "./accounts.service.js";
import { CategoriesController } from "./categories.controller.js";
import { CategoriesService } from "./categories.service.js";
import {
  LedgerController,
  TransactionsController,
} from "./transactions.controller.js";
import { LedgerService } from "./ledger.service.js";
import { TransactionsService } from "./transactions.service.js";
import { AccountsRepository } from "./repositories/accounts.repository.js";
import { CategoriesRepository } from "./repositories/categories.repository.js";
import { TransactionsRepository } from "./repositories/transactions.repository.js";

@Module({
  imports: [AuthModule],
  controllers: [
    AccountsController,
    CategoriesController,
    TransactionsController,
    LedgerController,
  ],
  providers: [
    AccountsService,
    CategoriesService,
    LedgerService,
    TransactionsService,
    AccountsRepository,
    CategoriesRepository,
    TransactionsRepository,
    SessionAuthGuard,
  ],
})
export class FinanceModule {}
