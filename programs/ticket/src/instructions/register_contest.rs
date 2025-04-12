use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct RegisterContest<'info> {
    pub system_program: Program<'info, System>,
}

impl <'info>RegisterContest<'info> {
    pub fn register_contest(&mut self) -> Result<()> {
        Ok(())
    }
}
