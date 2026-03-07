Publie le résultat d'un match des Aquilons dans Supabase.

## Instructions

L'utilisateur fournit un numéro de match et les scores des 2 sets. Utilise le MCP Supabase pour mettre à jour la table `matchs`.

### Format d'entrée attendu
`match <numero>: <aq_set1>-<adv_set1>, <aq_set2>-<adv_set2>`

Exemples :
- `/score match 1: 25-18, 25-20` → Victoire (2 sets gagnés)
- `/score match 3: 18-25, 25-22` → 1 set partout, demande s'il manque un set ou si c'est le résultat final
- `/score match 5: 20-25, 18-25` → Défaite (0 sets gagnés)

Si l'argument est `$ARGUMENTS` :

### Étapes

1. Parse le numéro de match et les scores des sets depuis `$ARGUMENTS`
2. Détermine le statut :
   - Compte les sets gagnés par les Aquilons (score Aquilons > score adversaire)
   - Si Aquilons gagne plus de sets → statut = `win`
   - Sinon → statut = `loss`
3. Exécute la mise à jour SQL via `mcp__supabase__execute_sql` :
   ```sql
   UPDATE matchs SET
     aq_set1 = <score>,
     adv_set1 = <score>,
     aq_set2 = <score>,
     adv_set2 = <score>,
     aq_score_courant = 0,
     adv_score_courant = 0,
     set_courant = 0,
     statut = '<win|loss>'
   WHERE tournoi_id = 'a0000000-0000-0000-0000-000000000001'
     AND numero = <numero>;
   ```
4. Confirme le résultat avec un résumé :
   - Numéro du match et adversaire
   - Scores des sets
   - Victoire ou défaite
   - Rappelle que la page https://fosketer.github.io/aquilons-tournoi-2026/ se met à jour en temps réel

### Matchs de référence
1. 9h30 vs Husky JDN
2. 10h30 vs Bleu et Or
3. 11h30 vs Express U14
4. 14h30 vs Les Condors
5. 16h30 vs Bleu et Or
6. 17h30 vs Tigres d'Amé
7. 19h30 vs Husky KS

### Gestion d'erreurs
- Si le format n'est pas reconnu, demande à l'utilisateur de reformuler
- Si un seul set est fourni, demande le score du 2e set
- Si les scores semblent invalides (ex: 25-30 sans avantage de 2), avertis l'utilisateur
