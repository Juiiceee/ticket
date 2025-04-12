use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CreateContest<'info> {
    pub system_program: Program<'info, System>,
}

impl <'info>CreateContest<'info> {
    pub fn create_contest(&mut self) -> Result<()> {
        Ok(())
    }
}
