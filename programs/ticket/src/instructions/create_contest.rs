use crate::state::Contest;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(max_tickets: u8)]
pub struct CreateContest<'info> {
    #[account(init,
		payer = signer,
		space = 8 + 32 + 20 + 60 + 8 + 1 + 1 + (1 + 32) + (4 + (32 * max_tickets as usize)) + 1,
		seeds = [b"contest", signer.key().as_ref()],
		bump)]
    pub contest: Account<'info, Contest>,
    /// CHECK: This is the signer who pays for the contest creation and is stored as the contest owner
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> CreateContest<'info> {
    pub fn create_contest(
        &mut self,
        name: String,
        description: String,
        ticket_price: u64,
        max_tickets: u8,
        bump: u8,
    ) -> Result<()> {
        let contest = &mut self.contest;
        contest.owner = self.signer.key();
        contest.name = name;
        contest.description = description;
        contest.ticket_price = ticket_price;
        contest.max_tickets = max_tickets;
        contest.total_tickets_sold = 0;
        contest.winner = None;
        contest.participant = Vec::new();
        contest.bump = bump;
        Ok(())
    }
}
