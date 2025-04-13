use crate::error::ErrorCode;
use crate::state::Contest;
use anchor_lang::prelude::*;
use anchor_lang::system_program;

#[derive(Accounts)]
pub struct RegisterContest<'info> {
    #[account(mut)]
    pub contest: Account<'info, Contest>,
    /// CHECK: This is the signer who pays for the contest creation and is stored as the contest owner
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> RegisterContest<'info> {
    pub fn register_contest(&mut self) -> Result<()> {
        let contest = &mut self.contest;

        if contest.total_tickets_sold >= contest.max_tickets || contest.winner.is_some() {
            return Err(ErrorCode::TicketLimitReached.into());
        }

        let amount = contest.ticket_price;

        system_program::transfer(
            CpiContext::new(
                self.system_program.to_account_info(),
                system_program::Transfer {
                    from: self.signer.to_account_info(),
                    to: contest.to_account_info(),
                },
            ),
            amount,
        )?;

        contest.total_tickets_sold += 1;
        contest.participant.push(self.signer.key());

        if contest.total_tickets_sold == contest.max_tickets {
            let rent_exempt_amount =
                Rent::get()?.minimum_balance(contest.to_account_info().data_len());

            let lamports = contest.to_account_info().lamports();

            let real_lamports = lamports.saturating_sub(rent_exempt_amount);

            contest.winner = Some(self.signer.key());

            **contest.to_account_info().try_borrow_mut_lamports()? -= real_lamports;
            **self.signer.to_account_info().try_borrow_mut_lamports()? += real_lamports;
        }
        Ok(())
    }
}
