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

    pub fn create_contest(
        ctx: Context<CreateContest>,
        name: String,
        description: String,
        ticket_price: u64,
        max_tickets: u8,
    ) -> Result<()> {
        ctx.accounts.create_contest(
            name,
            description,
            ticket_price,
            max_tickets,
            ctx.bumps.contest,
        )
    }

    pub fn register_contest(ctx: Context<RegisterContest>) -> Result<()> {
        ctx.accounts.register_contest()
    }
}
