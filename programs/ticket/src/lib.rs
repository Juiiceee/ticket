pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("Dt7bapXXtCZMtnEGGVJBFcne1AKjanjfVKHFCvFtAWQv");

#[program]
pub mod ticket {
    use super::*;

    pub fn create_contest(ctx: Context<CreateContest>) -> Result<()> {
        ctx.accounts.create_contest()
    }

    pub fn register_contest(ctx: Context<RegisterContest>) -> Result<()> {
        ctx.accounts.register_contest()
    }
}
