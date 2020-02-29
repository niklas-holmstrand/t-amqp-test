/// <reference types="Cypress" />

describe('App initialization', () => {
    beforeEach(() => {
        cy.seedAndVisit()
    })
    it('All lines displayed', () => {
        cy.get('.factory__lines')
          .children()
          .should('have.length', 3)
    })

    it('First line has correct name', () => {
        cy.get('.line__name')
        .eq(0)
        .should('contain', 'Finland')
    })

    it('Second line has correct name', () => {
        cy.get('.line__name')
        .eq(1)
        .should('contain', 'France')
    })

    it('Third line has correct name', () => {
        cy.get('.line__name')
        .eq(2)
        .should('contain', 'Denmark')
    })
})