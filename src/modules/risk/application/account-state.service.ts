import { Injectable } from '@nestjs/common';
import { AccountState } from '../domain/account-state';

@Injectable()
export class AccountStateService {
  getCurrentState(): AccountState {
    return {
      balance: 10_000,
      equity: 10_000,
      openTrades: 0,
      dailyPnL: 0,
    };
  }
}
