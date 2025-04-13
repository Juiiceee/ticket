use anchor_lang::prelude::*;

#[account]
pub struct Contest {
    pub owner: Pubkey,
    pub name: String,
    pub description: String,
    pub ticket_price: u64,
    pub max_tickets: u8,
    pub total_tickets_sold: u8,
    pub winner: Option<Pubkey>,
    pub participant: Vec<Pubkey>,
    pub bump: u8,
}