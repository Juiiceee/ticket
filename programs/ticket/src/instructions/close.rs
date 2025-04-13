use crate::state::Contest;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CloseContest<'info> {
    #[account(mut, close = signer,
		seeds = [b"contest", signer.key().as_ref()],
		bump)]
    pub contest: Account<'info, Contest>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> CloseContest<'info> {
    pub fn close_contest(&mut self) -> Result<()> {
        Ok(())
    }
}
