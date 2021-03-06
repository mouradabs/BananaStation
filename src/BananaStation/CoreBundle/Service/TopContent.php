<?php

namespace BananaStation\CoreBundle\Service;

use Doctrine\ORM\EntityManager;

class TopContent extends \Twig_Extension {

    protected $em;

    public function __construct(EntityManager $em) {
        $this->em = $em;
    }

    public function getTopPlusme() {
        $projetRepo = $this->em->getRepository('BananaStationCoreBundle:Projet');
        $projets = $projetRepo->findTopPlusme();
        foreach ($projets as $item) {
            foreach ($item->getAvis() as $value) {
                if ($value->getPouce() == 'M') {
                    $item->removeAvis($value);
                }
            }
        }
        return $projets;
    }

    public function getTopComment() {
        $projectRepo = $this->em->getRepository('BananaStationCoreBundle:Projet');
        return $projectRepo->findTopComment();
    }

    public function getFunctions() {
        return [
            'getTopPlusme' => new \Twig_SimpleFunction('getTopPlusme', [$this, 'getTopPlusme']),
            'getTopComment' => new \Twig_SimpleFunction('getTopComment', [$this, 'getTopComment'])
        ];
    }

    public function getName() {
        return 'TopContent';
    }

}
